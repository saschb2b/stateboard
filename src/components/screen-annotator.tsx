"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
  type Region,
  type RegionState,
  type ScreenWithRegions,
} from "@/lib/types";
import { RegionOverlay } from "./region-overlay";
import { StateChip } from "./state-chip";

interface ScreenAnnotatorProps {
  screen: ScreenWithRegions;
  onScreenUpdated: (screen: ScreenWithRegions) => void;
  /**
   * Viewer-role members can navigate into a board's editor URL but must
   * not be able to mutate anything. When true, drawing is disabled, the
   * draft form is suppressed, and the side panel renders existing regions
   * read-only.
   */
  readOnly?: boolean;
  /** When set, dim regions whose state does not match (filter pills). */
  filterState?: RegionState | null;
}

interface DraftRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Minimum draw size (relative units) to count as a region. */
const MIN_REGION_SIZE = 0.005;

export function ScreenAnnotator({
  screen,
  onScreenUpdated,
  readOnly = false,
  filterState = null,
}: ScreenAnnotatorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [regions, setRegions] = useState<Region[]>(screen.regions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draftDefaults, setDraftDefaults] = useState<{
    state: RegionState;
    label: string;
    notes: string;
  }>({ state: "shipped", label: "", notes: "" });

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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || !draft) return;
      const rel = toRel(e.clientX, e.clientY);
      if (!rel) return;
      setDraft({
        x: Math.min(draft.x, rel.x),
        y: Math.min(draft.y, rel.y),
        w: Math.abs(rel.x - draft.x),
        h: Math.abs(rel.y - draft.y),
      });
    },
    [drawing, draft, toRel],
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    if (!draft || draft.w < MIN_REGION_SIZE || draft.h < MIN_REGION_SIZE) {
      setDraft(null);
    }
  }, [drawing, draft]);

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
    if (!res.ok) return;
    const created: Region = await res.json();
    const next = [...regions, created];
    setRegions(next);
    onScreenUpdated({ ...screen, regions: next });
    setDraft(null);
    setDraftDefaults({ state: "shipped", label: "", notes: "" });
    setSelectedId(created.id);
  };

  const updateSelected = useCallback(
    async (patch: Partial<Pick<Region, "state" | "label" | "notes">>) => {
      if (!selected) return;
      // optimistic
      const optimistic = regions.map((r) =>
        r.id === selected.id ? { ...r, ...patch } : r,
      );
      setRegions(optimistic);
      const res = await fetch(`/api/regions/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        // revert on failure
        setRegions(regions);
        return;
      }
      const updated: Region = await res.json();
      const next = regions.map((r) => (r.id === updated.id ? updated : r));
      setRegions(next);
      onScreenUpdated({ ...screen, regions: next });
    },
    [selected, regions, screen, onScreenUpdated],
  );

  const deleteSelected = useCallback(async () => {
    if (!selected) return;
    const res = await fetch(`/api/regions/${selected.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const next = regions.filter((r) => r.id !== selected.id);
    setRegions(next);
    setSelectedId(null);
    onScreenUpdated({ ...screen, regions: next });
  }, [selected, regions, screen, onScreenUpdated]);

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, readOnly, updateSelected, deleteSelected]);

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
          1 shipped · 2 mock · 3 missing · ⌫ delete · esc deselect
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
                on this screen yet — ask an editor to add some.
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
            <StateSelector
              value={selected.state}
              onChange={(state) => updateSelected({ state })}
            />
            <TextField
              size="small"
              label="Label"
              helperText="Appears on the share link"
              value={selected.label ?? ""}
              onChange={(e) => updateSelected({ label: e.target.value })}
            />
            <TextField
              size="small"
              label="Notes"
              multiline
              minRows={2}
              value={selected.notes ?? ""}
              onChange={(e) => updateSelected({ notes: e.target.value })}
            />
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={deleteSelected}
            >
              Delete region
            </Button>
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
          return (
            <Box
              key={r.id}
              onClick={() => onSelect(r.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                cursor: "pointer",
                opacity: dimmed ? 0.4 : 1,
                "&:hover": { bgcolor: "action.hover" },
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
                {r.label ?? `Region ${i + 1}`}
              </Typography>
            </Box>
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
