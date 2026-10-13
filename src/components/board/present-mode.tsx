"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { RegionOverlay } from "@/components/region/region-overlay";
import { StateChip } from "@/components/region/state-chip";
import { REGION_STATES, type ScreenWithRegions } from "@/lib/types";

interface PresentModeProps {
  boardName: string;
  screens: ScreenWithRegions[];
  initialIndex?: number;
  onClose: () => void;
}

async function toggleBrowserFullscreen(): Promise<string | null> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    return null;
  } catch {
    return "Fullscreen is unavailable. Continue presenting in this window.";
  }
}

export function PresentMode({
  boardName,
  screens,
  initialIndex = 0,
  onClose,
}: PresentModeProps) {
  const safeInitial = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, screens.length - 1),
  );
  const [index, setIndex] = useState(safeInitial);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  const active = screens[index];
  const totals = { shipped: 0, mock: 0, missing: 0 };
  if (active) for (const region of active.regions) totals[region.state]++;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Focused controls keep their native Space/Enter action.
      if (
        event.key === " " &&
        event.target instanceof HTMLElement &&
        event.target.closest("button, a, input, textarea, select")
      )
        return;
      switch (event.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          event.preventDefault();
          setIndex((current) => Math.min(current + 1, screens.length - 1));
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          setIndex((current) => Math.max(current - 1, 0));
          break;
        case "f":
        case "F":
          event.preventDefault();
          void toggleBrowserFullscreen().then(setFullscreenError);
          break;
        case "Home":
          event.preventDefault();
          setIndex(0);
          break;
        case "End":
          event.preventDefault();
          setIndex(Math.max(0, screens.length - 1));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screens.length]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!active) return null;

  return (
    <Dialog
      open
      fullScreen
      onClose={(_, reason) => {
        if (reason === "escapeKeyDown" && document.fullscreenElement) {
          void toggleBrowserFullscreen().then(setFullscreenError);
        } else {
          onClose();
        }
      }}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          "aria-label": "Presentation mode",
          sx: {
            bgcolor: "background.default",
            color: "text.primary",
            borderRadius: 0,
            backgroundImage: "none",
            overflow: "hidden",
          },
        },
      }}
    >
      <Stack
        component="header"
        direction="row"
        alignItems="center"
        gap={2}
        sx={{
          px: { xs: 2, md: 3 },
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {boardName}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            component="p"
          >
            {active.label ?? `Screen ${index + 1}`}
          </Typography>
        </Box>
        <Stack direction="row" gap={0.5} sx={{ flexShrink: 0 }}>
          <IconButton
            onClick={() =>
              void toggleBrowserFullscreen().then(setFullscreenError)
            }
            size="small"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Exit presentation"
            autoFocus
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {fullscreenError && (
        <Alert
          severity="info"
          sx={{ mx: 2, mt: 1 }}
          onClose={() => setFullscreenError(null)}
        >
          {fullscreenError}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, md: 6 },
          py: 2,
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: `min(100%, calc((100dvh - 200px) * ${active.width} / ${active.height}))`,
            aspectRatio: `${active.width} / ${active.height}`,
            maxWidth: "100%",
            maxHeight: "100%",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.mediaUrl}
            alt={active.label ?? `Screen ${index + 1}`}
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
      </Box>

      <Stack
        component="footer"
        gap={1.5}
        sx={{
          px: { xs: 2, md: 3 },
          py: 1.5,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Stack
            direction="row"
            gap={{ xs: 1, sm: 2 }}
            alignItems="center"
            sx={{ flexWrap: "wrap" }}
          >
            {REGION_STATES.map((state) => (
              <Stack
                key={state}
                direction="row"
                alignItems="center"
                spacing={0.5}
              >
                <StateChip state={state} size="sm" />
                <Typography variant="caption" color="text.secondary">
                  {totals[state]}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ flexShrink: 0 }}
          >
            <IconButton
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              disabled={index === 0}
              aria-label="Previous screen"
              size="small"
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              aria-live="polite"
              sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
            >
              {index + 1} / {screens.length}
            </Typography>
            <IconButton
              onClick={() =>
                setIndex((current) => Math.min(current + 1, screens.length - 1))
              }
              disabled={index === screens.length - 1}
              aria-label="Next screen"
              size="small"
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          Arrow keys to move · F for fullscreen · Esc to exit
        </Typography>
      </Stack>
    </Dialog>
  );
}
