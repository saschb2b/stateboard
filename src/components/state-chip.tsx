"use client";

import Box from "@mui/material/Box";
import { STATE_META } from "@/lib/state-meta";
import type { RegionState } from "@/lib/types";

interface StateChipProps {
  state: RegionState;
  size?: "sm" | "md";
}

/**
 * Solid pill rendering one of the three v0 states.
 *
 * Styling is custom (not MUI Chip) because the brand language for these
 * three colors is load-bearing — they appear on the deck, in the editor,
 * and in the public share view, and need to look identical everywhere.
 */
export function StateChip({ state, size = "md" }: StateChipProps) {
  const meta = STATE_META[state];
  const padY = size === "sm" ? 0.25 : 0.5;
  const padX = size === "sm" ? 0.75 : 1;
  const fontSize = size === "sm" ? 10 : 11;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: padX,
        py: padY,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        bgcolor: meta.color,
        color: meta.contrast,
        borderRadius: 1,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {meta.label}
    </Box>
  );
}
