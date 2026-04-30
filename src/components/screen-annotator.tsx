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
  onScreenDeleted: () => void;
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
  onScreenDeleted,
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
  const [labelDraft, setLabelDraft] = useState(screen.label ?? "");

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
    [toRel],
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

  // cancel an in-flight draft on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraft(null);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    onScreenUpdated({ ...screen, regions: next, label: labelDraft || null });
    setDraft(null);
    setDraftDefaults({ state: "shipped", label: "", notes: "" });
    setSelectedId(created.id);
  };

  const updateSelected = async (
    patch: Partial<Pick<Region, "state" | "label" | "notes">>,
  ) => {
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
    onScreenUpdated({ ...screen, regions: next, label: labelDraft || null });
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const res = await fetch(`/api/regions/${selected.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const next = regions.filter((r) => r.id !== selected.id);
    setRegions(next);
    setSelectedId(null);
    onScreenUpdated({ ...screen, regions: next, label: labelDraft || null });
  };

  const persistLabel = async () => {
    const trimmed = labelDraft.trim();
    if ((screen.label ?? "") === trimmed) return;
    const res = await fetch(`/api/screens/${screen.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: trimmed || null }),
    });
    if (!res.ok) return;
    onScreenUpdated({ ...screen, regions, label: trimmed || null });
  };

  const deleteScreen = async () => {
    if (!confirm(`Delete this screen and its ${regions.length} region(s)?`)) {
      return;
    }
    const res = await fetch(`/api/screens/${screen.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    onScreenDeleted();
  };

  const aspect = `${screen.width} / ${screen.height}`;

  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ mt: 2 }}>
      {/* canvas */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <TextField
            size="small"
            label="Screen label"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={persistLabel}
            placeholder="e.g. Dashboard / Overview"
            sx={{ flex: 1, maxWidth: 360 }}
          />
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={deleteScreen}
          >
            Delete screen
          </Button>
        </Stack>
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
            cursor: drawing ? "crosshair" : "crosshair",
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
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1, color: "text.secondary" }}
        >
          Click and drag on the screen to mark a region. Click an existing
          region to edit it. Press Esc to cancel.
        </Typography>
      </Box>

      {/* side panel: draft form OR selected region OR placeholder */}
      <Paper sx={{ p: 2.5, width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
        {draft && draft.w >= MIN_REGION_SIZE && draft.h >= MIN_REGION_SIZE ? (
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
        ) : (
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Annotate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag on the screen to mark a region with one of three states.
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
