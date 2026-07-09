"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import { STATE_META } from "@/lib/state-meta";
import {
  REGION_STATES,
  attributionName,
  type Region,
  type RegionState,
  type ScreenWithRegions,
  type UserRef,
} from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { RegionOverlay } from "./region-overlay";
import {
  MIN_REGION_SIZE,
  moveBox,
  resizeBox,
  nudgeBox,
  type Box as RegionBox,
  type ResizeCorner,
} from "@/lib/region-geometry";
import { StateChip } from "./state-chip";

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
}

/** Pull the API's `{ error }` message off a failed response, else a fallback. */
async function failureMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? fallback;
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

export function ScreenAnnotator({
  screen,
  onScreenUpdated,
  onError,
  readOnly = false,
  filterState = null,
  authors,
  now,
}: ScreenAnnotatorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [regions, setRegions] = useState<Region[]>(screen.regions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Always-fresh handle to regions for callbacks that outlive the render that
  // created them (the debounced geometry persist and keyboard nudging). Kept
  // current via an effect — callbacks only fire after commit, never mid-render.
  const regionsRef = useRef(regions);
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);
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
      setSelectedId(null);
      setDraft({ x: rel.x, y: rel.y, w: 0, h: 0 });
      setDrawing(true);
    },
    [readOnly, toRel],
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
    setSelectedId(id);
    setDrag({
      id,
      mode: `resize-${corner}`,
      start: rel,
      orig: { x: region.x, y: region.y, w: region.w, h: region.h },
    });
  };

  // Persist a moved/resized box. The optimistic geometry is already in local
  // state from the drag/nudge; on failure we roll back to the pre-change box.
  // Reads regions through the ref so a debounced call sees the latest state.
  const persistGeometry = useCallback(
    async (
      id: string,
      box: { x: number; y: number; w: number; h: number },
      orig: { x: number; y: number; w: number; h: number },
    ) => {
      const res = await fetch(`/api/regions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(box),
      });
      if (!res.ok) {
        const reverted = regionsRef.current.map((r) =>
          r.id === id ? { ...r, ...orig } : r,
        );
        setRegions(reverted);
        onScreenUpdated({ ...screen, regions: reverted });
        onError?.(await failureMessage(res, "Couldn't update the region."));
        return;
      }
      const updated: Region = await res.json();
      const next = regionsRef.current.map((r) =>
        r.id === updated.id ? updated : r,
      );
      setRegions(next);
      onScreenUpdated({ ...screen, regions: next });
    },
    [screen, onScreenUpdated, onError],
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
    if (!draft) return;
    const res = await fetch(`/api/screens/${screen.id}/regions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        state: draftDefaults.state,
        label: draftDefaults.label || null,
        notes: draftDefaults.notes || null,
      }),
    });
    if (!res.ok) {
      onError?.(await failureMessage(res, "Couldn't save the region."));
      return;
    }
    const created: Region = await res.json();
    const next = [...regions, created];
    setRegions(next);
    onScreenUpdated({ ...screen, regions: next });
    setDraft(null);
    setDraftDefaults({ state: "shipped", label: "", notes: "" });
    setSelectedId(created.id);
  };

  // Persist a region's label/notes. Called on a short idle after typing stops
  // and on blur — never per keystroke — so a burst of typing becomes one PATCH
  // (and one audit row). Merges through the always-fresh regionsRef so a slow
  // response can't clobber newer local state.
  const persistText = useCallback(
    async (
      id: string,
      patch: { label?: string | null; notes?: string | null },
    ) => {
      const res = await fetch(`/api/regions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        onError?.(await failureMessage(res, "Couldn't save the region."));
        return;
      }
      const updated: Region = await res.json();
      const next = regionsRef.current.map((r) =>
        r.id === updated.id ? updated : r,
      );
      setRegions(next);
      onScreenUpdated({ ...screen, regions: next });
    },
    [screen, onScreenUpdated, onError],
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

  const updateSelected = useCallback(
    async (patch: Partial<Pick<Region, "state">>) => {
      const id = selectedId;
      if (!id) return;
      // Serialize any pending text edit ahead of this discrete change.
      flushTextRef.current();
      const before = regionsRef.current;
      const optimistic = before.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      );
      setRegions(optimistic);
      const res = await fetch(`/api/regions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        // revert on failure
        setRegions(before);
        onError?.(await failureMessage(res, "Couldn't update the region."));
        return;
      }
      const updated: Region = await res.json();
      const next = regionsRef.current.map((r) =>
        r.id === updated.id ? updated : r,
      );
      setRegions(next);
      onScreenUpdated({ ...screen, regions: next });
    },
    [selectedId, screen, onScreenUpdated, onError],
  );

  const deleteSelected = useCallback(async () => {
    if (!selected) return;
    // Drop any pending text save for this region so it can't PATCH a row that's
    // about to be deleted.
    if (textTimer.current) {
      clearTimeout(textTimer.current);
      textTimer.current = null;
    }
    pendingTextId.current = null;
    const res = await fetch(`/api/regions/${selected.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      onError?.(await failureMessage(res, "Couldn't delete the region."));
      return;
    }
    const next = regions.filter((r) => r.id !== selected.id);
    setRegions(next);
    setSelectedId(null);
    onScreenUpdated({ ...screen, regions: next });
  }, [selected, regions, screen, onScreenUpdated, onError]);

  // --- keyboard ----------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // skip while typing in form fields
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }

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
    <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
      {/* canvas */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          ref={surfaceRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: aspect,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            cursor: readOnly ? "default" : "crosshair",
            userSelect: "none",
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

        {/* keyboard shortcut hint, only useful while a region is selected
            in editable mode (viewers can't act on these keys) */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.75,
            color: "text.secondary",
            fontFamily: "monospace",
            opacity: hintVisible ? 1 : 0,
            transition: "opacity 160ms ease",
            minHeight: "1.4em",
          }}
        >
          1 shipped · 2 mock · 3 missing · arrows move · ⇧ resize · ⌫ delete ·
          esc deselect
        </Typography>
      </Box>

      {/* side panel: draft form OR selected region OR region list / help */}
      <Paper sx={{ p: 2.5, width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
        {readOnly && selected ? (
          <Stack spacing={2}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Region
              </Typography>
              <IconButton
                size="small"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StateChip state={selected.state} size="sm" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selected.label || "Untitled"}
              </Typography>
            </Stack>
            {selected.notes ? (
              <Typography variant="body2" color="text.secondary">
                {selected.notes}
              </Typography>
            ) : null}
            <RegionAttribution region={selected} authors={authors} now={now} />
          </Stack>
        ) : readOnly ? (
          regions.length > 0 ? (
            <RegionList
              regions={regions}
              onSelect={setSelectedId}
              filterState={filterState}
              readOnly
            />
          ) : (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Read-only
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have viewer access to this workspace. There are no regions
                on this screen yet. Ask an editor to add some.
              </Typography>
            </Stack>
          )
        ) : draft &&
          draft.w >= MIN_REGION_SIZE &&
          draft.h >= MIN_REGION_SIZE ? (
          <Stack spacing={2}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                New region
              </Typography>
              <IconButton
                size="small"
                onClick={() => setDraft(null)}
                aria-label="Discard draft"
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
              label="Label"
              placeholder="e.g. Revenue card"
              value={draftDefaults.label}
              onChange={(e) =>
                setDraftDefaults((d) => ({ ...d, label: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Notes (optional)"
              multiline
              minRows={2}
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
              >
                Add region
              </Button>
              <Button onClick={() => setDraft(null)}>Cancel</Button>
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
                Region
              </Typography>
              <IconButton
                size="small"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Drag the box to move it, or pull a corner to resize.
            </Typography>
            <StateSelector
              value={selected.state}
              onChange={(state) => updateSelected({ state })}
            />
            <TextField
              size="small"
              label="Label"
              helperText="Appears on the share link · saved when you pause or click away"
              value={draftLabel}
              onChange={(e) => {
                setDraftLabel(e.target.value);
                scheduleTextSave(selected.id);
              }}
              onBlur={() => flushText()}
            />
            <TextField
              size="small"
              label="Notes"
              multiline
              minRows={2}
              value={draftNotes}
              onChange={(e) => {
                setDraftNotes(e.target.value);
                scheduleTextSave(selected.id);
              }}
              onBlur={() => flushText()}
            />
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={deleteSelected}
            >
              Delete region
            </Button>
            <RegionAttribution region={selected} authors={authors} now={now} />
          </Stack>
        ) : regions.length > 0 ? (
          <RegionList
            regions={regions}
            onSelect={setSelectedId}
            filterState={filterState}
          />
        ) : (
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Drag to mark a region
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click and drag anywhere on the screenshot. You&apos;ll pick one of
              three states for what you draw:
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
                    {STATE_META[s].description}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
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
  const editor = region.updatedBy ? authors[region.updatedBy] : null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ pt: 1.5, borderTop: 1, borderColor: "divider" }}
    >
      Last edited by {attributionName(editor)} ·{" "}
      {timeAgo(region.updatedAt, now)}
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
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: "text.secondary" }}
      >
        STATE
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
            {STATE_META[s].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

/**
 * Idle-state region list. Replaces the static three-state legend once
 * the user has any regions, since the legend at that point is just
 * describing what they've already done.
 */
function RegionList({
  regions,
  onSelect,
  filterState,
  readOnly = false,
}: {
  regions: Region[];
  onSelect: (id: string) => void;
  filterState: RegionState | null;
  readOnly?: boolean;
}) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Regions
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {regions.length}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        {regions.map((r, i) => {
          const dimmed = filterState !== null && r.state !== filterState;
          const name = r.label ?? `Region ${i + 1}`;
          return (
            <ButtonBase
              key={r.id}
              onClick={() => onSelect(r.id)}
              aria-label={`${STATE_META[r.state].label}: ${name}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                textAlign: "left",
                gap: 1,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                opacity: dimmed ? 0.4 : 1,
                "&:hover": { bgcolor: "action.hover" },
                "&.Mui-focusVisible": {
                  bgcolor: "action.hover",
                  outline: 2,
                  outlineStyle: "solid",
                  outlineColor: "primary.main",
                  outlineOffset: -2,
                },
                transition: "opacity 160ms ease",
              }}
            >
              <StateChip state={r.state} size="sm" />
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: r.label ? "text.primary" : "text.secondary",
                  fontStyle: r.label ? "normal" : "italic",
                }}
              >
                {name}
              </Typography>
            </ButtonBase>
          );
        })}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ pt: 0.5, borderTop: 1, borderColor: "divider", mt: 1 }}
      >
        {readOnly
          ? "Click a region to see its label and notes."
          : "Drag on the screenshot to add another, or click a region above to edit it."}
      </Typography>
    </Stack>
  );
}
