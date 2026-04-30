"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { AppHeader } from "./app-header";
import { RegionOverlay } from "./region-overlay";
import { StateChip } from "./state-chip";
import type { Board, ScreenWithRegions } from "@/lib/types";
import { REGION_STATES } from "@/lib/types";

interface BoardShareProps {
  board: Board;
  screens: ScreenWithRegions[];
}

/**
 * Read-only share surface (the artifact stakeholders actually look at).
 *
 * Mirrors the editor layout but strips all interactive affordances:
 * no upload, no draw, no delete. Tooltips on regions remain so the
 * label/notes can still be read on hover.
 */
export function BoardShare({ board, screens }: BoardShareProps) {
  const [activeId, setActiveId] = useState<string | null>(
    screens[0]?.id ?? null,
  );

  const active = useMemo(
    () => screens.find((s) => s.id === activeId) ?? null,
    [screens, activeId],
  );

  const totals = useMemo(() => {
    const counts = { shipped: 0, mock: 0, missing: 0 };
    for (const s of screens) {
      for (const r of s.regions) counts[r.state]++;
    }
    return counts;
  }, [screens]);

  return (
    <>
      <AppHeader crumb={board.name} />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {board.description ? (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 720 }}
          >
            {board.description}
          </Typography>
        ) : null}

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mb: 3, flexWrap: "wrap" }}
        >
          {REGION_STATES.map((s) => (
            <Stack
              key={s}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                px: 1.5,
                py: 0.75,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <StateChip state={s} size="sm" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {totals[s]}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {screens.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              No screens yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The owner of this board hasn&apos;t uploaded any screenshots.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ overflow: "hidden" }}>
            <Tabs
              value={activeId}
              onChange={(_, v) => setActiveId(v as string)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
            >
              {screens.map((s, i) => (
                <Tab
                  key={s.id}
                  value={s.id}
                  label={s.label || `Screen ${i + 1}`}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                />
              ))}
            </Tabs>
            <Box sx={{ p: 2.5 }}>
              {active ? (
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: `${active.width} / ${active.height}`,
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${active.filename}`}
                    alt={active.label ?? "screen"}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                  <RegionOverlay regions={active.regions} interactive />
                </Box>
              ) : null}
            </Box>
          </Paper>
        )}
      </Container>
    </>
  );
}
