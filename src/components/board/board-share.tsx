"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useEffect, useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { AppHeader } from "@/components/app/app-header";
import { PresentMode } from "./present-mode";
import { RegionOverlay } from "@/components/region/region-overlay";
import { StateChip } from "@/components/region/state-chip";
import type { Board, ScreenWithRegions } from "@/lib/types";
import { REGION_STATES } from "@/lib/types";

interface BoardShareProps {
  board: Board;
  screens: ScreenWithRegions[];
  /**
   * Pre-rendered "3d ago" freshness label. Computed server-side so the
   * client render stays pure; omitted for the demo board, whose timestamps
   * are fictional.
   */
  updatedLabel?: string | null;
  updatedAt?: number;
  now?: number;
  notice?: ReactNode;
}

/**
 * Read-only share surface (the artifact stakeholders actually look at).
 *
 * Mirrors the editor layout but strips all interactive affordances:
 * no upload, no draw, no delete. Tooltips on regions remain so the
 * label/notes can still be read on hover.
 */
export function BoardShare({
  board,
  screens,
  updatedLabel: initialUpdatedLabel,
  updatedAt,
  now,
  notice,
}: BoardShareProps) {
  const t = useTranslations("Visual");
  const format = useFormatter();
  const updatedLabel =
    updatedAt !== undefined && now !== undefined
      ? format.relativeTime(updatedAt, now)
      : initialUpdatedLabel;
  const tabId = useId();
  const [activeId, setActiveId] = useState<string | null>(
    screens[0]?.id ?? null,
  );
  const [presenting, setPresenting] = useState(false);

  const active = screens.find((screen) => screen.id === activeId) ?? screens[0];
  const totals = { shipped: 0, mock: 0, missing: 0 };
  for (const screen of screens) {
    for (const region of screen.regions) totals[region.state]++;
  }

  // global "P" hotkey for presentation mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "p" && e.key !== "P") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input, textarea, select, [contenteditable=true]")
      )
        return;
      if (presenting || screens.length === 0) return;
      e.preventDefault();
      setPresenting(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, screens.length]);

  return (
    <>
      <AppHeader
        crumb={board.name}
        actions={
          screens.length > 0 ? (
            <Tooltip title={t("presentShortcut")} describeChild>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<SlideshowIcon />}
                onClick={() => setPresenting(true)}
              >
                {t("present")}
              </Button>
            </Tooltip>
          ) : null
        }
      />
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack component="header" spacing={1} sx={{ mb: 3, maxWidth: 800 }}>
          <Typography variant="overline" color="text.secondary">
            {t("visualReview")}
          </Typography>
          <Typography
            component="h1"
            variant="h4"
            sx={{ overflowWrap: "anywhere" }}
          >
            {board.name}
          </Typography>
          {board.description ? (
            <Typography variant="body2" color="text.secondary">
              {board.description}
            </Typography>
          ) : null}
          {notice}
        </Stack>

        <Stack
          direction="row"
          gap={2}
          alignItems="center"
          sx={{ mb: 2, flexWrap: "wrap" }}
        >
          {REGION_STATES.map((state) => (
            <Tooltip key={state} title={t(`states.${state}.description`)}>
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                aria-label={t("stateSummary", {
                  count: totals[state],
                  state: t(`states.${state}.label`),
                  summary: t(`states.${state}.summary`),
                })}
              >
                <StateChip state={state} size="sm" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                >
                  {totals[state]}
                </Typography>
              </Stack>
            </Tooltip>
          ))}
          {updatedLabel ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: { sm: "auto" } }}
            >
              {t("updatedAt", { time: updatedLabel })}
            </Typography>
          ) : null}
        </Stack>

        {screens.length === 0 ? (
          <Paper sx={{ p: { xs: 3, sm: 5 } }}>
            <Typography component="h2" variant="subtitle1" sx={{ mb: 0.5 }}>
              {t("noScreens")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("noScreensOwner")}
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ overflow: "hidden" }}>
            <Tabs
              value={active?.id ?? false}
              onChange={(_, value: string) => setActiveId(value)}
              aria-label={t("screens")}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
            >
              {screens.map((s, i) => (
                <Tab
                  key={s.id}
                  value={s.id}
                  id={`${tabId}-${s.id}`}
                  aria-controls={`${tabId}-panel`}
                  label={s.label || t("screenNumber", { number: i + 1 })}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                />
              ))}
            </Tabs>
            <Box
              role="tabpanel"
              id={`${tabId}-panel`}
              aria-labelledby={active ? `${tabId}-${active.id}` : undefined}
              sx={{ p: { xs: 1.5, sm: 2.5 } }}
            >
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
                    src={active.mediaUrl}
                    alt={
                      active.label ??
                      t("screenNumber", { number: screens.indexOf(active) + 1 })
                    }
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: "block", sm: "none" }, mt: 1.5 }}
              >
                {t("tapRegion")}
              </Typography>
            </Box>
          </Paper>
        )}
      </Container>
      {presenting ? (
        <PresentMode
          boardName={board.name}
          screens={screens}
          initialIndex={Math.max(
            0,
            screens.findIndex((s) => s.id === active?.id),
          )}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </>
  );
}
