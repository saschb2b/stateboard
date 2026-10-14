"use client";

import { useTranslations, useFormatter } from "next-intl";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import { MONO_FONT } from "@/lib/theme";
import { STATE_META } from "@/lib/state-meta";
import {
  REGION_STATES,
  attributionName,
  type Region,
  type RegionState,
  type ScreenWithRegions,
  type UserRef,
} from "@/lib/types";
import { RegionOverlay } from "@/components/region/region-overlay";
import {
  MIN_REGION_SIZE,
  moveBox,
  resizeBox,
  nudgeBox,
  type Box as RegionBox,
  type ResizeCorner,
} from "@/lib/region-geometry";
import { StateChip } from "@/components/region/state-chip";
import { createMutationQueue } from "@/lib/mutation-queue";
import { mergeSavedRegion, type RegionPatch } from "@/lib/region-update";
import { isInteractiveKeyEvent } from "@/lib/keyboard-shortcuts";
import { clientRequest } from "@/lib/client-request";

interface ScreenAnnotatorProps {
  screen: ScreenWithRegions;
  onScreenUpdated: (screen: ScreenWithRegions) => void;
  /** Report a failed save so the parent can surface it (e.g. a snackbar). */
  onError?: (message: string) => void;
  /**
   * Viewer-role members can navigate into a board's editor URL but must
   * not be able to mutate anything. When true, drawing is disabled, the
   * draft form is suppressed, and the side panel renders existing regions
   * read-only.
   */
  readOnly?: boolean;
  /** When set, dim regions whose state does not match (filter pills). */
  filterState?: RegionState | null;
  /** Author id → identity, for the selected region's "last edited by" line. */
  authors: Record<string, UserRef>;
  /** Server render time, so the relative-time label needs no client clock. */
  now: number;
  /** Supporting product context, shown beside the selected region. */
  renderRegionDetails?: (region: Region) => React.ReactNode;
  /**
   * A region on this screen to select — set by the command palette when it
   * jumps to a region. One-shot: `onFocusConsumed` fires once it's applied so
   * the shell can clear it (and a later manual return to this screen doesn't
   * re-select it).
   */
  focusRegionId?: string;
  onFocusConsumed?: () => void;
}

interface DraftRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = "move" | `resize-${ResizeCorner}`;

interface DragState {
  id: string;
  mode: DragMode;
  /** Pointer position (relative units) where the drag began. */
  start: { x: number; y: number };
  /** The region's box at drag start, used as the delta base. */
  orig: RegionBox;
}

/** Dispatch a drag delta to the shared move / corner-resize geometry. */
function applyDrag(drag: DragState, dx: number, dy: number): RegionBox {
  if (drag.mode === "move") return moveBox(drag.orig, dx, dy);
  return resizeBox(
    drag.orig,
    drag.mode.slice("resize-".length) as ResizeCorner,
    dx,
    dy,
  );
}

export function ScreenAnnotator(props: ScreenAnnotatorProps) {
  return (
    <ScreenAnnotatorView
      {...props}
      createRegion={(data) =>
        clientRequest<Region>(`/api/screens/${props.screen.id}/regions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        })
      }
      updateRegion={(id, patch) =>
        clientRequest<Region>(`/api/regions/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        })
      }
      deleteRegion={async (id) => {
        await clientRequest(`/api/regions/${id}`, { method: "DELETE" });
      }}
    />
  );
}

export function ScreenAnnotatorView({
  screen,
  onScreenUpdated,
  onError,
  readOnly = false,
  filterState = null,
  authors,
  now,
  renderRegionDetails,
  focusRegionId,
  onFocusConsumed,
  createRegion,
  updateRegion,
  deleteRegion,
}: ScreenAnnotatorProps & {
  createRegion: (data: RegionPatch) => Promise<Region>;
  updateRegion: (id: string, patch: RegionPatch) => Promise<Region>;
  deleteRegion: (id: string) => Promise<void>;
}) {
  const t = useTranslations("Visual");
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [regions, setRegions] = useState<Region[]>(screen.regions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [interactionInspectorOpen, setInteractionInspectorOpen] = useState<
    boolean | null
  >(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [enqueueMutation] = useState(createMutationQueue);
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const deleting = useRef(new Set<string>());
  const savedGeometry = useRef(
    new Map(
      screen.regions.map((region) => [
        region.id,
        {
          x: region.x,
          y: region.y,
          w: region.w,
          h: region.h,
        },
      ]),
    ),
  );
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  // Always-fresh handle to regions for callbacks that outlive the render that
  // created them (the debounced geometry persist and keyboard nudging). Kept
  // current via an effect — callbacks only fire after commit, never mid-render.
  const regionsRef = useRef(regions);
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);
  const publishRegions = useCallback(
    (next: Region[]) => {
      regionsRef.current = next;
      setRegions(next);
      onScreenUpdated({ ...screenRef.current, regions: next });
    },
    [onScreenUpdated],
  );
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgePending = useRef<{
    id: string;
    orig: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [draftDefaults, setDraftDefaults] = useState<{
    state: RegionState;
    label: string;
    notes: string;
  }>({ state: "shipped", label: "", notes: "" });

  // Local draft of the selected region's text fields. These drive the inputs so
  // typing is instant and a slow save can't reset the value mid-keystroke (which
  // used to drop characters like spaces). Persistence is debounced separately.
  const [draftLabel, setDraftLabel] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  // Mirror the drafts into refs so the debounced/blur save reads the latest
  // value without being re-created on every keystroke.
  const draftLabelRef = useRef(draftLabel);
  const draftNotesRef = useRef(draftNotes);
  useEffect(() => {
    draftLabelRef.current = draftLabel;
  }, [draftLabel]);
  useEffect(() => {
    draftNotesRef.current = draftNotes;
  }, [draftNotes]);
  const textTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTextId = useRef<string | null>(null);

  // No effect needed to reset on screen change: the parent passes
  // `key={screen.id}`, which remounts this component and re-runs the
  // lazy initializers above with the new screen's data.

  const selected = useMemo(
    () => regions.find((r) => r.id === selectedId) ?? null,
    [regions, selectedId],
  );

  // The inspector is contextual: it only claims canvas width when there's
  // something to edit — a selected region, an in-progress draft, or the
  // first-region onboarding on an empty screen. Otherwise it slides away so the
  // canvas spans the full width.
  const draftActive = Boolean(
    draft && draft.w >= MIN_REGION_SIZE && draft.h >= MIN_REGION_SIZE,
  );
  const inspectorOpen =
    interactionInspectorOpen ??
    (Boolean(selected) || draftActive || regions.length === 0);

  // --- drawing -----------------------------------------------------------

  const toRel = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const surface = surfaceRef.current;
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
      };
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      if (e.button !== 0) return;
      // ignore drags that started on a child overlay (region click)
      if (e.target !== surfaceRef.current && e.target !== e.currentTarget) {
        return;
      }
      const rel = toRel(e.clientX, e.clientY);
      if (!rel) return;
      surfaceRef.current?.focus();
      setInteractionInspectorOpen(inspectorOpen);
      setSelectedId(null);
      setDraft({ x: rel.x, y: rel.y, w: 0, h: 0 });
      setDrawing(true);
    },
    [readOnly, toRel, inspectorOpen],
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drag) {
      const rel = toRel(e.clientX, e.clientY);
      if (!rel) return;
      const box = applyDrag(drag, rel.x - drag.start.x, rel.y - drag.start.y);
      setRegions((prev) =>
        prev.map((r) => (r.id === drag.id ? { ...r, ...box } : r)),
      );
      return;
    }
    if (!drawing || !draft) return;
    const rel = toRel(e.clientX, e.clientY);
    if (!rel) return;
    setDraft({
      x: Math.min(draft.x, rel.x),
      y: Math.min(draft.y, rel.y),
      w: Math.abs(rel.x - draft.x),
      h: Math.abs(rel.y - draft.y),
    });
  };

  const handleMouseUp = () => {
    setInteractionInspectorOpen(null);
    if (drag) {
      const region = regions.find((r) => r.id === drag.id);
      const { orig, id } = drag;
      setDrag(null);
      if (
        region &&
        (region.x !== orig.x ||
          region.y !== orig.y ||
          region.w !== orig.w ||
          region.h !== orig.h)
      ) {
        void persistGeometry(
          id,
          { x: region.x, y: region.y, w: region.w, h: region.h },
          orig,
        );
      }
      return;
    }
    if (!drawing) return;
    setDrawing(false);
    if (!draft || draft.w < MIN_REGION_SIZE || draft.h < MIN_REGION_SIZE) {
      setDraft(null);
    }
  };

  // Grab a region's body to move it: select it and record the drag origin;
  // the surface's mousemove/up handlers carry it from there.
  const beginRegionDrag = (id: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    const region = regions.find((r) => r.id === id);
    const rel = toRel(e.clientX, e.clientY);
    if (!region || !rel) return;
    surfaceRef.current?.focus();
    setInteractionInspectorOpen(inspectorOpen);
    setDraft(null);
    setSelectedId(id);
    setDrag({
      id,
      mode: "move",
      start: rel,
      orig: { x: region.x, y: region.y, w: region.w, h: region.h },
    });
  };

  const beginResize = (
    id: string,
    corner: ResizeCorner,
    e: React.MouseEvent,
  ) => {
    if (readOnly) return;
    e.stopPropagation();
    const region = regions.find((r) => r.id === id);
    const rel = toRel(e.clientX, e.clientY);
    if (!region || !rel) return;
    surfaceRef.current?.focus();
    setInteractionInspectorOpen(inspectorOpen);
    setSelectedId(id);
    setDrag({
      id,
      mode: `resize-${corner}`,
      start: rel,
      orig: { x: region.x, y: region.y, w: region.w, h: region.h },
    });
  };

  // Each region has one write queue. Geometry stays responsive while a save runs.
  const persistGeometry = useCallback(
    async (id: string, box: RegionBox, orig: RegionBox) => {
      if (deleting.current.has(id)) return;
      const stillMatches = (region: Region) =>
        region.x === box.x &&
        region.y === box.y &&
        region.w === box.w &&
        region.h === box.h;
      try {
        const updated = await enqueueMutation(id, () => updateRegion(id, box));
        savedGeometry.current.set(id, {
          x: updated.x,
          y: updated.y,
          w: updated.w,
          h: updated.h,
        });
        publishRegions(
          regionsRef.current.map((region) =>
            region.id === id && stillMatches(region)
              ? mergeSavedRegion(region, updated, box)
              : region,
          ),
        );
      } catch (cause) {
        publishRegions(
          regionsRef.current.map((region) =>
            region.id === id && stillMatches(region)
              ? { ...region, ...(savedGeometry.current.get(id) ?? orig) }
              : region,
          ),
        );
        onError?.(
          cause instanceof Error ? cause.message : t("saveRegionPositionError"),
        );
      }
    },
    [enqueueMutation, updateRegion, publishRegions, onError, t],
  );

  // Persist a pending keyboard nudge. Fired on a short idle, and also when the
  // selection changes or the screen unmounts, so a nudge is never lost.
  const flushNudge = useCallback(() => {
    if (nudgeTimer.current) {
      clearTimeout(nudgeTimer.current);
      nudgeTimer.current = null;
    }
    const pending = nudgePending.current;
    nudgePending.current = null;
    if (!pending) return;
    const cur = regionsRef.current.find((r) => r.id === pending.id);
    if (
      cur &&
      (cur.x !== pending.orig.x ||
        cur.y !== pending.orig.y ||
        cur.w !== pending.orig.w ||
        cur.h !== pending.orig.h)
    ) {
      void persistGeometry(
        pending.id,
        { x: cur.x, y: cur.y, w: cur.w, h: cur.h },
        pending.orig,
      );
    }
  }, [persistGeometry]);

  // --- API actions -------------------------------------------------------

  const persistDraft = async () => {
    if (!draft || createInFlight.current) return;
    createInFlight.current = true;
    setCreating(true);
    try {
      const created = await createRegion({
        ...draft,
        state: draftDefaults.state,
        label: draftDefaults.label || null,
        notes: draftDefaults.notes || null,
      });
      savedGeometry.current.set(created.id, {
        x: created.x,
        y: created.y,
        w: created.w,
        h: created.h,
      });
      publishRegions([...regionsRef.current, created]);
      setDraft(null);
      setDraftDefaults({ state: "shipped", label: "", notes: "" });
      setSelectedId(created.id);
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : t("saveRegionError"));
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  };

  const persistText = useCallback(
    async (id: string, patch: Pick<RegionPatch, "label" | "notes">) => {
      if (deleting.current.has(id)) return;
      try {
        const updated = await enqueueMutation(id, () =>
          updateRegion(id, patch),
        );
        publishRegions(
          regionsRef.current.map((region) =>
            region.id === id
              ? mergeSavedRegion(region, updated, patch)
              : region,
          ),
        );
      } catch (cause) {
        onError?.(
          cause instanceof Error ? cause.message : t("saveRegionTextError"),
        );
      }
    },
    [enqueueMutation, updateRegion, publishRegions, onError, t],
  );

  // Flush a pending text edit now, sending only the fields that actually
  // changed from what's stored. Fired on idle, on blur, when the selection
  // changes, and on unmount, so an edit is never lost.
  const flushText = useCallback(() => {
    if (textTimer.current) {
      clearTimeout(textTimer.current);
      textTimer.current = null;
    }
    const id = pendingTextId.current;
    pendingTextId.current = null;
    if (!id) return;
    const cur = regionsRef.current.find((r) => r.id === id);
    if (!cur) return;
    const label = draftLabelRef.current.trim() || null;
    const notes = draftNotesRef.current.trim() || null;
    const patch: { label?: string | null; notes?: string | null } = {};
    if (label !== (cur.label ?? null)) patch.label = label;
    if (notes !== (cur.notes ?? null)) patch.notes = notes;
    if (Object.keys(patch).length > 0) void persistText(id, patch);
  }, [persistText]);

  // Stable handle to the latest flushText, so the debounce timer and the
  // selection/unmount effects can call it without listing it as a dependency
  // (which would otherwise re-fire them on unrelated parent re-renders).
  const flushTextRef = useRef(flushText);
  useEffect(() => {
    flushTextRef.current = flushText;
  }, [flushText]);

  // Debounce a text save 600ms after the last keystroke.
  const scheduleTextSave = (id: string) => {
    pendingTextId.current = id;
    if (textTimer.current) clearTimeout(textTimer.current);
    textTimer.current = setTimeout(() => flushTextRef.current(), 600);
  };

  // On selection change, flush the previous region's pending edit, then repoint
  // the draft fields at the newly-selected region. Keyed on selectedId only: it
  // must not re-run (and wipe in-progress typing) on unrelated renders.
  useEffect(() => {
    flushTextRef.current();
    const r = regionsRef.current.find((x) => x.id === selectedId);
    setDraftLabel(r?.label ?? "");
    setDraftNotes(r?.notes ?? "");
  }, [selectedId]);

  // Save a still-pending text edit if the screen unmounts (e.g. tab switch).
  useEffect(() => () => flushTextRef.current(), []);

  // Select the region the command palette jumped to, once. Guarded to this
  // screen; `onFocusConsumed` clears the request so returning here later (or a
  // parent re-render) doesn't re-select it.
  useEffect(() => {
    if (!focusRegionId) return;
    if (!regionsRef.current.some((r) => r.id === focusRegionId)) return;
    setDraft(null);
    setSelectedId(focusRegionId);
    onFocusConsumed?.();
  }, [focusRegionId, onFocusConsumed]);

  const updateSelected = useCallback(
    async (patch: Partial<Pick<Region, "state">>) => {
      const id = selectedId;
      if (!id || deleting.current.has(id)) return;
      flushTextRef.current();
      try {
        const updated = await enqueueMutation(id, () =>
          updateRegion(id, patch),
        );
        publishRegions(
          regionsRef.current.map((region) =>
            region.id === id
              ? mergeSavedRegion(region, updated, patch)
              : region,
          ),
        );
      } catch (cause) {
        onError?.(
          cause instanceof Error ? cause.message : t("saveRegionStateError"),
        );
      }
    },
    [selectedId, enqueueMutation, updateRegion, publishRegions, onError, t],
  );

  const deleteSelected = useCallback(async () => {
    if (!selected || deleting.current.has(selected.id)) return;
    const id = selected.id;
    flushTextRef.current();
    deleting.current.add(id);
    if (textTimer.current) {
      clearTimeout(textTimer.current);
      textTimer.current = null;
    }
    pendingTextId.current = null;
    if (nudgePending.current?.id === id) nudgePending.current = null;
    try {
      await enqueueMutation(id, () => deleteRegion(id));
      savedGeometry.current.delete(id);
      publishRegions(regionsRef.current.filter((region) => region.id !== id));
      setSelectedId((current) => (current === id ? null : current));
    } catch (cause) {
      onError?.(
        cause instanceof Error ? cause.message : t("deleteRegionError"),
      );
    } finally {
      deleting.current.delete(id);
    }
  }, [selected, enqueueMutation, deleteRegion, publishRegions, onError, t]);

  // --- keyboard ----------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInteractiveKeyEvent(e)) return;

      if (e.key === "Escape") {
        setDraft(null);
        setSelectedId(null);
        return;
      }

      // shortcuts that act on the currently-selected region. Disabled in
      // read-only mode — viewer-role members must not mutate anything.
      if (readOnly || !selectedId) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "1") {
        e.preventDefault();
        void updateSelected({ state: "shipped" });
      } else if (e.key === "2") {
        e.preventDefault();
        void updateSelected({ state: "mock" });
      } else if (e.key === "3") {
        e.preventDefault();
        void updateSelected({ state: "missing" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void deleteSelected();
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        const region = regionsRef.current.find((r) => r.id === selectedId);
        if (!region) return;
        e.preventDefault();
        // If a different region was mid-nudge, save it before starting this one.
        if (nudgePending.current && nudgePending.current.id !== selectedId) {
          flushNudge();
        }
        // Remember the pre-nudge box once per run so a failed save rolls back.
        if (!nudgePending.current) {
          nudgePending.current = {
            id: selectedId,
            orig: { x: region.x, y: region.y, w: region.w, h: region.h },
          };
        }
        const box = nudgeBox(region, e.key, e.shiftKey, 0.005);
        setRegions((prev) =>
          prev.map((r) => (r.id === selectedId ? { ...r, ...box } : r)),
        );
        if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(flushNudge, 350);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, readOnly, updateSelected, deleteSelected, flushNudge]);

  // Save a still-pending nudge if the screen unmounts before the idle timer
  // fires (e.g. switching tabs right after nudging), so the move isn't lost.
  useEffect(() => () => flushNudge(), [flushNudge]);

  const aspect = `${screen.width} / ${screen.height}`;
  const hintVisible = !readOnly && Boolean(selectedId);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        overflow: { xs: "auto", md: "hidden" },
      }}
    >
      {/* canvas — grows to fill; the surface is sized to fit the box on both
          axes (its max width is capped by the available height × aspect) so a
          wide screenshot also uses the vertical space, no JS measurement. */}
      <Box
        sx={{
          flex: { xs: "0 0 auto", md: 1 },
          minWidth: 0,
          minHeight: { xs: "auto", md: 0 },
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Box
          sx={{
            flex: { xs: "0 0 auto", md: 1 },
            minHeight: { xs: "auto", md: 0 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            ref={surfaceRef}
            role="group"
            aria-label={t("annotationCanvas")}
            tabIndex={0}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: {
                xs: "100%",
                md: `calc((100dvh - 150px) * ${screen.width} / ${screen.height})`,
              },
              aspectRatio: aspect,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
              cursor: readOnly ? "default" : "crosshair",
              userSelect: "none",
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            {/* background image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screen.mediaUrl}
              alt={screen.label ?? "screen"}
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />

            {/* existing regions */}
            <RegionOverlay
              regions={regions}
              interactive
              selectedId={selectedId}
              onSelect={(id) => {
                setDraft(null);
                setSelectedId(id);
              }}
              onRegionMouseDown={readOnly ? undefined : beginRegionDrag}
              onResizeStart={readOnly ? undefined : beginResize}
              filterState={filterState}
            />

            {/* live draft rectangle */}
            {draft && draft.w > 0 && draft.h > 0 ? (
              <Box
                sx={{
                  position: "absolute",
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.w * 100}%`,
                  height: `${draft.h * 100}%`,
                  border: `2px dashed ${STATE_META[draftDefaults.state].color}`,
                  bgcolor: STATE_META[draftDefaults.state].fill,
                  pointerEvents: "none",
                }}
              />
            ) : null}
          </Box>
        </Box>

        {/* keyboard shortcut hint, only useful while a region is selected
            in editable mode (viewers can't act on these keys) */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.75,
            textAlign: "center",
            color: "text.secondary",
            fontFamily: MONO_FONT,
            opacity: hintVisible ? 1 : 0,
            transition: "opacity 160ms ease",
            minHeight: "1.4em",
          }}
        >
          {t("annotationKeys")}
        </Typography>
      </Box>

      {/* inspector: the per-region editor. Contextual — it only claims canvas
          width when there's something to edit (a selected region, a draft, or
          the empty-screen onboarding), otherwise it slides away so the canvas
          spans full width. Board-wide status/filter lives in the header. */}
      <Box
        component="aside"
        aria-label={t("inspector")}
        aria-hidden={!inspectorOpen}
        sx={{
          display: inspectorOpen ? "block" : { xs: "none", md: "block" },
          width: inspectorOpen ? { xs: "100%", md: 312 } : 0,
          flexShrink: 0,
          overflow: "hidden",
          borderLeft: inspectorOpen ? { md: 1 } : 0,
          borderTop: inspectorOpen ? { xs: 1, md: 0 } : 0,
          borderColor: "divider",
          bgcolor: "background.paper",
          transition: "width 160ms ease",
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: 312 },
            height: { xs: "auto", md: "100%" },
            overflowY: { xs: "visible", md: "auto" },
            p: 2,
          }}
        >
          {!inspectorOpen ? null : readOnly && selected ? (
            <Stack spacing={2}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("region")}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setSelectedId(null)}
                  aria-label={t("close")}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <StateChip state={selected.state} size="sm" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selected.label || t("untitled")}
                </Typography>
              </Stack>
              {selected.notes ? (
                <Typography variant="body2" color="text.secondary">
                  {selected.notes}
                </Typography>
              ) : null}
              {renderRegionDetails?.(selected)}
              <RegionAttribution
                region={selected}
                authors={authors}
                now={now}
              />
            </Stack>
          ) : readOnly ? (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t("readOnly")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("readOnlyHelp")}
              </Typography>
            </Stack>
          ) : draftActive ? (
            <Stack spacing={2}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("newRegion")}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setDraft(null)}
                  aria-label={t("discardDraft")}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <StateSelector
                value={draftDefaults.state}
                onChange={(state) => setDraftDefaults((d) => ({ ...d, state }))}
              />
              <TextField
                size="small"
                label={t("label")}
                placeholder={t("regionLabelExample")}
                value={draftDefaults.label}
                onChange={(e) =>
                  setDraftDefaults((d) => ({ ...d, label: e.target.value }))
                }
              />
              <TextField
                size="small"
                label={t("notesOptional")}
                multiline
                minRows={2}
                maxRows={6}
                value={draftDefaults.notes}
                onChange={(e) =>
                  setDraftDefaults((d) => ({ ...d, notes: e.target.value }))
                }
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={persistDraft}
                  disabled={creating}
                >
                  {creating ? t("saving") : t("addRegion")}
                </Button>
                <Button disabled={creating} onClick={() => setDraft(null)}>
                  {t("cancel")}
                </Button>
              </Stack>
            </Stack>
          ) : selected ? (
            <Stack spacing={2}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("region")}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setSelectedId(null)}
                  aria-label={t("close")}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t("dragRegionHelp")}
              </Typography>
              <StateSelector
                value={selected.state}
                onChange={(state) => updateSelected({ state })}
              />
              <TextField
                size="small"
                label={t("label")}
                helperText={t("regionLabelHelp")}
                value={draftLabel}
                onChange={(e) => {
                  setDraftLabel(e.target.value);
                  scheduleTextSave(selected.id);
                }}
                onBlur={() => flushText()}
              />
              <TextField
                size="small"
                label={t("notes")}
                multiline
                minRows={2}
                maxRows={6}
                value={draftNotes}
                onChange={(e) => {
                  setDraftNotes(e.target.value);
                  scheduleTextSave(selected.id);
                }}
                onBlur={() => flushText()}
              />
              {renderRegionDetails?.(selected)}
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={deleteSelected}
              >
                {t("deleteRegion")}
              </Button>
              <RegionAttribution
                region={selected}
                authors={authors}
                now={now}
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t("markRegion")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("markRegionHelp")}
              </Typography>
              <Stack spacing={1}>
                {REGION_STATES.map((s) => (
                  <Stack
                    key={s}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                  >
                    <StateChip state={s} size="sm" />
                    <Typography variant="body2" color="text.secondary">
                      {t(`states.${s}.description`)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Muted footer on the selected-region panel: who last touched this region and
 * when. Region `updated_by` is written on the same PATCH as the label/notes, so
 * unlike the board line this is an accurate "who wrote this note" answer. A null
 * editor (the account was deleted) reads as "a former member". Editor-only — the
 * public share view never renders this panel.
 */
function RegionAttribution({
  region,
  authors,
  now,
}: {
  region: Region;
  authors: Record<string, UserRef>;
  now: number;
}) {
  const t = useTranslations("Visual");
  const format = useFormatter();
  const editor = region.updatedBy ? authors[region.updatedBy] : null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ pt: 1.5, borderTop: 1, borderColor: "divider" }}
    >
      {t("editedBy", {
        name: editor ? attributionName(editor) : t("formerMember"),
        time: format.relativeTime(region.updatedAt, now),
      })}
    </Typography>
  );
}

function StateSelector({
  value,
  onChange,
}: {
  value: RegionState;
  onChange: (next: RegionState) => void;
}) {
  const t = useTranslations("Visual");
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: "text.secondary" }}
      >
        {t("state")}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        size="small"
        onChange={(_, next: RegionState | null) => next && onChange(next)}
        fullWidth
      >
        {REGION_STATES.map((s) => (
          <ToggleButton
            key={s}
            value={s}
            sx={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.05em",
              "&.Mui-selected": {
                bgcolor: STATE_META[s].color,
                color: STATE_META[s].contrast,
                "&:hover": { bgcolor: STATE_META[s].color },
              },
            }}
          >
            {t(`states.${s}.label`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
