"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { STATE_META } from "@/lib/state-meta";
import type { Region, RegionState } from "@/lib/types";
import { StateChip } from "./state-chip";
import type { ResizeCorner } from "@/lib/region-geometry";

const RESIZE_CORNERS: ResizeCorner[] = ["nw", "ne", "sw", "se"];

const CORNER_CURSOR: Record<ResizeCorner, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
};

interface RegionOverlayProps {
  regions: Region[];
  /**
   * If true, the overlay is interactive (click to edit). Defaults false —
   * the public share view uses the non-interactive variant.
   */
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /**
   * When set, regions whose state does not match are rendered dimmed,
   * so a viewer can isolate one state at a time. Used by the editor's
   * clickable state-counter pills.
   */
  filterState?: RegionState | null;
  /**
   * Editor only. When provided, a region's body becomes a move handle:
   * pressing it selects the region and begins a drag. Resize handles are
   * drawn on the selected region and report which corner was grabbed via
   * onResizeStart. The share view and presenter omit both, so they stay
   * strictly read-only.
   */
  onRegionMouseDown?: (id: string, e: React.MouseEvent) => void;
  onResizeStart?: (
    id: string,
    corner: ResizeCorner,
    e: React.MouseEvent,
  ) => void;
}

/**
 * Draws the colored rectangles for a list of regions onto an absolutely-
 * positioned overlay. Coordinates are read straight from each region in
 * normalized [0..1] space, so the overlay scales with whatever container
 * sits behind it (the screenshot).
 *
 * Each region's state chip + label are combined into one tab anchored to
 * the rectangle's top-left edge, half-protruding above the box. This keeps
 * the label visually attached to its region — a chip floating in dead
 * space between two adjacent regions reads as orphaned.
 */
export function RegionOverlay({
  regions,
  interactive = false,
  selectedId,
  onSelect,
  filterState = null,
  onRegionMouseDown,
  onResizeStart,
}: RegionOverlayProps) {
  const editable = Boolean(onRegionMouseDown);
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        // Container is always pass-through so the annotator below can still
        // receive mousedown on empty space. Region boxes opt back in below.
        pointerEvents: "none",
      }}
    >
      {regions.map((r) => {
        const meta = STATE_META[r.state];
        const isSelected = selectedId === r.id;
        const dimmed = filterState !== null && r.state !== filterState;
        return (
          <Tooltip
            key={r.id}
            title={
              r.label || r.notes ? (
                <Box>
                  {r.label ? (
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: r.notes ? 0.5 : 0 }}
                    >
                      {r.label}
                    </Typography>
                  ) : null}
                  {r.notes ? (
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {r.notes}
                    </Typography>
                  ) : null}
                </Box>
              ) : (
                meta.description
              )
            }
            arrow
            placement="top"
            disableHoverListener={!interactive && !r.label && !r.notes}
          >
            <Box
              onClick={
                interactive && onSelect && !editable
                  ? () => onSelect(r.id)
                  : undefined
              }
              onMouseDown={
                editable && onRegionMouseDown
                  ? (e) => onRegionMouseDown(r.id, e)
                  : undefined
              }
              sx={{
                position: "absolute",
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                border: `2px solid ${meta.color}`,
                bgcolor: meta.fill,
                borderRadius: 0.5,
                cursor: editable
                  ? isSelected
                    ? "move"
                    : "pointer"
                  : interactive
                    ? "pointer"
                    : "default",
                pointerEvents: interactive ? "auto" : "none",
                outline: isSelected ? `2px solid ${meta.color}` : "none",
                outlineOffset: isSelected ? 2 : 0,
                opacity: dimmed ? 0.18 : 1,
                transition: "outline-offset 120ms ease, opacity 160ms ease",
              }}
            >
              {/* Combined state chip + label, anchored to top-left edge.
                  Sits half-above the box so it reads as glued-on rather
                  than as a chip floating in space. */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "stretch",
                  maxWidth: "calc(100% + 4px)",
                  borderRadius: 1,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}
              >
                <StateChip state={r.state} size="sm" />
                {r.label ? (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 0.75,
                      bgcolor: "rgba(0,0,0,0.85)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.label}
                  </Box>
                ) : null}
              </Box>

              {/* Resize handles, only on the selected region in the editor. */}
              {editable && isSelected && onResizeStart
                ? RESIZE_CORNERS.map((corner) => (
                    <Box
                      key={corner}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(r.id, corner, e);
                      }}
                      sx={{
                        position: "absolute",
                        top: corner.startsWith("n") ? 0 : "100%",
                        left: corner.endsWith("w") ? 0 : "100%",
                        transform: "translate(-50%, -50%)",
                        width: 12,
                        height: 12,
                        bgcolor: meta.color,
                        border: "1.5px solid rgba(255,255,255,0.92)",
                        borderRadius: "2px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        cursor: CORNER_CURSOR[corner],
                        pointerEvents: "auto",
                        zIndex: 3,
                      }}
                    />
                  ))
                : null}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
