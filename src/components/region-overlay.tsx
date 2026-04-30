"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { STATE_META } from "@/lib/state-meta";
import type { Region } from "@/lib/types";
import { StateChip } from "./state-chip";

interface RegionOverlayProps {
  regions: Region[];
  /**
   * If true, the overlay is interactive (click to edit). Defaults false —
   * the public share view uses the non-interactive variant.
   */
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/**
 * Draws the colored rectangles for a list of regions onto an absolutely-
 * positioned overlay. Coordinates are read straight from each region in
 * normalized [0..1] space, so the overlay scales with whatever container
 * sits behind it (the screenshot).
 */
export function RegionOverlay({
  regions,
  interactive = false,
  selectedId,
  onSelect,
}: RegionOverlayProps) {
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
                interactive && onSelect ? () => onSelect(r.id) : undefined
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
                cursor: interactive ? "pointer" : "default",
                pointerEvents: interactive ? "auto" : "none",
                outline: isSelected ? `2px solid ${meta.color}` : "none",
                outlineOffset: isSelected ? 2 : 0,
                transition: "outline-offset 120ms ease",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  transform: "translateY(-100%)",
                }}
              >
                <StateChip state={r.state} size="sm" />
              </Box>
              {r.label ? (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    px: 0.75,
                    py: 0.25,
                    fontSize: 11,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.label}
                </Box>
              ) : null}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
