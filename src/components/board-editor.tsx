"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { AppHeader } from "./app-header";
import { BoardPresenter } from "./board-presenter";
import { ScreenAnnotator } from "./screen-annotator";
import { ScreenUploader } from "./screen-uploader";
import { StateChip } from "./state-chip";
import type { Board, ScreenWithRegions } from "@/lib/types";
import { REGION_STATES } from "@/lib/types";

interface BoardEditorProps {
  board: Board;
  initialScreens: ScreenWithRegions[];
}

export function BoardEditor({ board, initialScreens }: BoardEditorProps) {
  const [screens, setScreens] = useState<ScreenWithRegions[]>(initialScreens);
  const [activeId, setActiveId] = useState<string | null>(
    initialScreens[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);

  const active = useMemo(
    () => screens.find((s) => s.id === activeId) ?? null,
    [screens, activeId],
  );

  const handleUploaded = (screen: ScreenWithRegions) => {
    setScreens((prev) => [...prev, screen]);
    setActiveId(screen.id);
  };

  const handleScreenUpdated = (updated: ScreenWithRegions) => {
    setScreens((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleScreenDeleted = (deletedId: string) => {
    setScreens((prev) => {
      const next = prev.filter((s) => s.id !== deletedId);
      if (activeId === deletedId) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v/${board.slug}`
      : `/v/${board.slug}`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard not available
    }
  };

  // global "P" shortcut → enter presentation mode (skipped while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "p" && e.key !== "P") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (presenting) return;
      if (screens.length === 0) return;
      e.preventDefault();
      setPresenting(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, screens.length]);

  // count regions by state across all screens (status overview)
  const totals = useMemo(() => {
    const counts = { shipped: 0, mock: 0, missing: 0 };
    for (const s of screens) {
      for (const r of s.regions) counts[r.state]++;
    }
    return counts;
  }, [screens]);

  return (
    <>
      <AppHeader
        crumb={board.name}
        actions={
          <>
            <Tooltip title="Present (P)">
              <span>
                <Button
                  size="small"
                  startIcon={<SlideshowIcon />}
                  onClick={() => setPresenting(true)}
                  variant="contained"
                  color="primary"
                  disabled={screens.length === 0}
                >
                  Present
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={copied ? "Copied!" : "Copy share link"}>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={copyShare}
                variant="outlined"
              >
                {copied ? "Copied" : "Share"}
              </Button>
            </Tooltip>
            <Tooltip title="Open share view">
              <IconButton
                size="small"
                component="a"
                href={`/v/${board.slug}`}
                target="_blank"
                rel="noopener"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        }
      />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* status totals */}
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
          <Box sx={{ flex: 1 }} />
          <ScreenUploader
            boardId={board.id}
            onUploaded={handleUploaded}
            compact={screens.length > 0}
          />
        </Stack>

        {screens.length === 0 ? (
          <ScreenUploader boardId={board.id} onUploaded={handleUploaded} />
        ) : (
          <Paper sx={{ p: 0, overflow: "hidden" }}>
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
                <ScreenAnnotator
                  key={active.id}
                  screen={active}
                  onScreenUpdated={handleScreenUpdated}
                  onScreenDeleted={() => handleScreenDeleted(active.id)}
                />
              ) : null}
            </Box>
          </Paper>
        )}
      </Container>
      {presenting ? (
        <BoardPresenter
          boardName={board.name}
          screens={screens}
          initialIndex={Math.max(
            0,
            screens.findIndex((s) => s.id === activeId),
          )}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </>
  );
}
