"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { RegionOverlay } from "./region-overlay";
import { StateChip } from "./state-chip";
import { REGION_STATES, type ScreenWithRegions } from "@/lib/types";

interface BoardPresenterProps {
  boardName: string;
  screens: ScreenWithRegions[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Fullscreen, clutter-free presentation surface.
 *
 * One screen at a time, painted with regions, no editor chrome. Designed
 * for showing to non-technical stakeholders without explaining what an
 * "edit panel" is. Keyboard-driven like Google Slides:
 *   ← / →  prev / next
 *   Esc    exit
 *   F      toggle browser fullscreen
 */
export function BoardPresenter({
  boardName,
  screens,
  initialIndex = 0,
  onClose,
}: BoardPresenterProps) {
  const safeInitial = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, screens.length - 1),
  );
  const [index, setIndex] = useState(safeInitial);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const active = screens[index];
  const totals = useMemo(() => {
    const counts = { shipped: 0, mock: 0, missing: 0 };
    if (active) for (const r of active.regions) counts[r.state]++;
    return counts;
  }, [active]);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, screens.length - 1)),
    [screens.length],
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // user agent refused — silently ignore, esc still works to close
    }
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case "ArrowRight":
        case " ":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "f":
        case "F":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            void toggleFullscreen();
          }
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(screens.length - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, toggleFullscreen, screens.length]);

  // track browser fullscreen state for the icon
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // auto-hide chrome after 2.5s of mouse stillness
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      setChromeVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setChromeVisible(false), 2500);
    };
    ping();
    window.addEventListener("mousemove", ping);
    window.addEventListener("keydown", ping);
    return () => {
      window.removeEventListener("mousemove", ping);
      window.removeEventListener("keydown", ping);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // lock body scroll while presenting
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!active) return null;

  return (
    <Box
      role="dialog"
      aria-label="Presentation mode"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (t) => t.zIndex.modal + 10,
        bgcolor: "#0A0F12",
        color: "#ECECEC",
        display: "flex",
        flexDirection: "column",
        cursor: chromeVisible ? "default" : "none",
      }}
    >
      {/* Top chrome — board name + counter + controls */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          px: 3,
          py: 1.5,
          opacity: chromeVisible ? 1 : 0,
          transition: "opacity 240ms ease",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            aria-hidden
            sx={{
              width: 12,
              height: 12,
              bgcolor: "primary.main",
              borderRadius: 0.5,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            STATEBOARD
          </Typography>
        </Stack>
        <Typography
          variant="subtitle1"
          noWrap
          sx={{ fontWeight: 600, color: "rgba(255,255,255,0.9)" }}
        >
          {boardName}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1.5} alignItems="center">
          {REGION_STATES.map((s) => (
            <Stack key={s} direction="row" alignItems="center" spacing={0.75}>
              <StateChip state={s} size="sm" />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "rgba(255,255,255,0.8)" }}
              >
                {totals[s]}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <IconButton
          onClick={() => void toggleFullscreen()}
          size="small"
          sx={{ color: "rgba(255,255,255,0.7)" }}
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
          sx={{ color: "rgba(255,255,255,0.7)" }}
          aria-label="Exit presentation"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Stage — current screen, fitted, regions painted */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, md: 6 },
          pb: 6,
        }}
      >
        <Box
          sx={{
            position: "relative",
            // Fit-letterbox: cap each dimension so the aspect ratio is
            // preserved inside the available stage area without overflowing.
            width:
              active.width / active.height > 1
                ? "min(100%, calc((100vh - 160px) * " +
                  active.width +
                  " / " +
                  active.height +
                  "))"
                : "min(100%, calc(100vw - 96px))",
            aspectRatio: `${active.width} / ${active.height}`,
            maxWidth: "100%",
            maxHeight: "calc(100vh - 160px)",
            margin: "0 auto",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "#000",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/${active.filename}`}
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

        {/* Side nav arrows */}
        {index > 0 ? (
          <IconButton
            onClick={prev}
            aria-label="Previous screen"
            sx={{
              position: "absolute",
              left: { xs: 4, md: 16 },
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.85)",
              opacity: chromeVisible ? 1 : 0,
              transition: "opacity 240ms ease",
              "&:hover": { bgcolor: "rgba(255,255,255,0.14)" },
            }}
            size="large"
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        ) : null}
        {index < screens.length - 1 ? (
          <IconButton
            onClick={next}
            aria-label="Next screen"
            sx={{
              position: "absolute",
              right: { xs: 4, md: 16 },
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.85)",
              opacity: chromeVisible ? 1 : 0,
              transition: "opacity 240ms ease",
              "&:hover": { bgcolor: "rgba(255,255,255,0.14)" },
            }}
            size="large"
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        ) : null}
      </Box>

      {/* Bottom chrome — screen label + counter + hint */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          px: 3,
          pb: 2,
          opacity: chromeVisible ? 1 : 0,
          transition: "opacity 240ms ease",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 500, flex: 1 }}
          noWrap
        >
          {active.label ?? `Screen ${index + 1}`}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "monospace",
            mx: 2,
          }}
        >
          ← → navigate · F fullscreen · Esc exit
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {index + 1} / {screens.length}
        </Typography>
      </Stack>
    </Box>
  );
}
