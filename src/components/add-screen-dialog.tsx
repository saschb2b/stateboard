"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import { ScreenUploader } from "./screen-uploader";
import type { ScreenWithRegions, WorkspaceScreen } from "@/lib/types";

type Tab = "upload" | "reuse";

interface AddScreenDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  initialTab?: Tab;
  /** Called with the newly-added screen(s): one for upload, one-or-more reuse. */
  onAdded: (screens: ScreenWithRegions[]) => void;
}

/**
 * Add-a-screen dialog with two ways in: upload a new file, or reuse a
 * screenshot already in another board (the "media library" pattern). Reuse
 * copies the image bytes server-side, so the new screen is independent and
 * starts with no regions — you annotate it fresh.
 */
export function AddScreenDialog({
  open,
  onClose,
  boardId,
  initialTab = "upload",
  onAdded,
}: AddScreenDialogProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [available, setAvailable] = useState<WorkspaceScreen[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load the gallery the first time the Reuse tab is shown. The parent
  // mounts this dialog fresh on each open, so the state starts clean and the
  // fetch runs once per open. Every setState lives inside an async callback,
  // never synchronously in the effect body.
  useEffect(() => {
    if (tab !== "reuse" || available !== null || loadError) return;
    let cancelled = false;
    fetch("/api/workspace/screens")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: WorkspaceScreen[]) => {
        if (!cancelled) setAvailable(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, available, loadError]);

  const loading = tab === "reuse" && available === null && !loadError;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addSelected = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/screens/reuse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceScreenIds: [...selected] }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't add the screenshots.");
        setAdding(false);
        return;
      }
      const screens: ScreenWithRegions[] = await res.json();
      onAdded(screens);
      onClose();
    } catch {
      setError("Couldn't add the screenshots.");
      setAdding(false);
    }
  };

  // The gallery, minus this board's own screens, filtered by the search box,
  // grouped by source board (insertion order = newest board first).
  const others = (available ?? []).filter((s) => s.boardId !== boardId);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? others.filter((s) =>
        `${s.boardName} ${s.label ?? ""}`.toLowerCase().includes(q),
      )
    : others;
  const groups = new Map<
    string,
    { name: string; screens: WorkspaceScreen[] }
  >();
  for (const s of filtered) {
    const g = groups.get(s.boardId) ?? { name: s.boardName, screens: [] };
    g.screens.push(s);
    groups.set(s.boardId, g);
  }

  return (
    <Dialog
      open={open}
      onClose={adding ? undefined : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>Add a screen</DialogTitle>
      <DialogContent sx={{ minHeight: 380 }}>
        <ToggleButtonGroup
          value={tab}
          exclusive
          size="small"
          onChange={(_, v: Tab | null) => v && setTab(v)}
          sx={{ mb: 2.5 }}
        >
          <ToggleButton value="upload" sx={{ textTransform: "none", px: 2 }}>
            Upload new
          </ToggleButton>
          <ToggleButton value="reuse" sx={{ textTransform: "none", px: 2 }}>
            Reuse existing
          </ToggleButton>
        </ToggleButtonGroup>

        {tab === "upload" ? (
          <Box>
            <ScreenUploader
              boardId={boardId}
              onUploaded={(s) => {
                onAdded([s]);
                onClose();
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1.5 }}
            >
              Already uploaded this shot to another board? Switch to{" "}
              <b>Reuse existing</b> instead of uploading it again.
            </Typography>
          </Box>
        ) : loading ? (
          <Stack alignItems="center" sx={{ py: 8 }} spacing={1.5}>
            <CircularProgress size={28} />
            <Typography variant="caption" color="text.secondary">
              Loading your screenshots…
            </Typography>
          </Stack>
        ) : loadError ? (
          <Stack alignItems="center" sx={{ py: 8 }} spacing={1}>
            <Typography variant="body2" color="error">
              Couldn&apos;t load your screenshots. Close and try again.
            </Typography>
          </Stack>
        ) : others.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 8 }} spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Nothing to reuse yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 360 }}
            >
              Screenshots you upload to your other boards show up here, ready to
              drop into this one without re-uploading.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by board or label"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {filtered.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 4, textAlign: "center" }}
              >
                No screenshots match your search.
              </Typography>
            ) : (
              [...groups.values()].map((group) => (
                <Box key={group.screens[0]?.boardId}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {group.name}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: "repeat(2, 1fr)",
                        sm: "repeat(3, 1fr)",
                        md: "repeat(4, 1fr)",
                      },
                    }}
                  >
                    {group.screens.map((s) => (
                      <Thumb
                        key={s.id}
                        screen={s}
                        selected={selected.has(s.id)}
                        onToggle={() => toggle(s.id)}
                      />
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        )}

        {error ? (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", mt: 2 }}
          >
            {error}
          </Typography>
        ) : null}
      </DialogContent>

      {tab === "reuse" && others.length > 0 ? (
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            {selected.size} selected
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={adding}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={selected.size === 0 || adding}
              onClick={addSelected}
            >
              {adding
                ? "Adding…"
                : selected.size > 0
                  ? `Add ${selected.size} screen${selected.size === 1 ? "" : "s"}`
                  : "Add screens"}
            </Button>
          </Stack>
        </DialogActions>
      ) : null}
    </Dialog>
  );
}

function Thumb({
  screen,
  selected,
  onToggle,
}: {
  screen: WorkspaceScreen;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? "Deselect" : "Select"} ${
        screen.label ?? "screen"
      } from ${screen.boardName}`}
      sx={{
        position: "relative",
        p: 0,
        cursor: "pointer",
        borderRadius: 1,
        overflow: "hidden",
        aspectRatio: "16 / 10",
        bgcolor: "background.default",
        border: 2,
        borderColor: selected ? "primary.main" : "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color 120ms ease",
        "&:hover": {
          borderColor: selected ? "primary.main" : "text.secondary",
        },
        "&:focus-visible": {
          outline: 2,
          outlineStyle: "solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screen.mediaUrl}
        alt=""
        loading="lazy"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      {selected ? (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            color: "primary.main",
            bgcolor: "background.paper",
            borderRadius: "50%",
            display: "flex",
            lineHeight: 0,
          }}
        >
          <CheckCircleIcon fontSize="small" />
        </Box>
      ) : null}
      {screen.label ? (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            px: 0.75,
            py: 0.25,
            bgcolor: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {screen.label}
        </Box>
      ) : null}
    </Box>
  );
}
