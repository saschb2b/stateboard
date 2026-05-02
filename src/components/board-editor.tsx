"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { AppHeader } from "./app-header";
import { BoardPresenter } from "./board-presenter";
import { ScreenAnnotator } from "./screen-annotator";
import { ScreenUploader } from "./screen-uploader";
import { StateChip } from "./state-chip";
import { UserMenu } from "./user-menu";
import type { Board, ScreenWithRegions, ShareLink } from "@/lib/types";
import { REGION_STATES } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

interface BoardEditorProps {
  board: Board;
  initialScreens: ScreenWithRegions[];
  initialShareLinks: ShareLink[];
  viewer: CurrentMember;
}

const canEdit = (role: CurrentMember["role"]) =>
  role === "owner" || role === "editor";

export function BoardEditor({
  board,
  initialScreens,
  initialShareLinks,
  viewer,
}: BoardEditorProps) {
  const [screens, setScreens] = useState<ScreenWithRegions[]>(initialScreens);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(initialShareLinks);
  const [activeId, setActiveId] = useState<string | null>(
    initialScreens[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);

  const editable = canEdit(viewer.role);

  const active = useMemo(
    () => screens.find((s) => s.id === activeId) ?? null,
    [screens, activeId],
  );

  const activeShareLink = useMemo(
    () => shareLinks.find((l) => l.revokedAt === null) ?? null,
    [shareLinks],
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

  const deleteCurrentScreen = async () => {
    if (!active) return;
    if (
      !confirm(`Delete this screen and its ${active.regions.length} region(s)?`)
    ) {
      return;
    }
    const res = await fetch(`/api/screens/${active.id}`, { method: "DELETE" });
    if (!res.ok) return;
    handleScreenDeleted(active.id);
  };

  const ensureShareLink = async (): Promise<ShareLink | null> => {
    if (activeShareLink) return activeShareLink;
    const res = await fetch(`/api/boards/${board.id}/share-links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const link: ShareLink = await res.json();
    setShareLinks((prev) => [link, ...prev]);
    return link;
  };

  const copyShare = async () => {
    const link = await ensureShareLink();
    if (!link) return;
    const url = `${window.location.origin}/share/${link.token}`;
    try {
      await navigator.clipboard.writeText(url);
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

  const totalRegions = totals.shipped + totals.mock + totals.missing;

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
            {activeShareLink ? (
              <Tooltip title="Open share view">
                <IconButton
                  size="small"
                  component="a"
                  href={`/share/${activeShareLink.token}`}
                  target="_blank"
                  rel="noopener"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {screens.length === 0 ? (
          <Stack spacing={1.5} sx={{ mt: 4 }}>
            {editable ? (
              <ScreenUploader boardId={board.id} onUploaded={handleUploaded} />
            ) : (
              <Box
                sx={{
                  p: 6,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  No screens yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  An editor hasn&apos;t uploaded any screenshots to this board.
                </Typography>
              </Box>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: "center" }}
            >
              Not sure what to upload?{" "}
              <Box
                component="a"
                href="/share/demo"
                target="_blank"
                rel="noopener"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                See the example board ↗
              </Box>
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ flexWrap: "wrap", rowGap: 1 }}
            >
              {screens.length > 1 ? (
                <Tabs
                  value={activeId}
                  onChange={(_, v) => setActiveId(v as string)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 36,
                    "& .MuiTab-root": {
                      minHeight: 36,
                      py: 0.5,
                      textTransform: "none",
                      fontWeight: 600,
                    },
                  }}
                >
                  {screens.map((s, i) => (
                    <Tab
                      key={s.id}
                      value={s.id}
                      label={s.label || `Screen ${i + 1}`}
                    />
                  ))}
                </Tabs>
              ) : null}

              {active && editable ? (
                <ScreenLabelInput
                  key={active.id}
                  screen={active}
                  onUpdated={handleScreenUpdated}
                />
              ) : null}

              <Box sx={{ flex: 1 }} />

              {totalRegions > 0
                ? REGION_STATES.map((s) => (
                    <Stack
                      key={s}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        px: 1.5,
                        py: 0.5,
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
                  ))
                : null}

              {editable ? (
                <ScreenUploader
                  boardId={board.id}
                  onUploaded={handleUploaded}
                  compact
                />
              ) : null}
              {active && editable ? (
                <Tooltip title="Delete this screen and its regions">
                  <IconButton
                    size="small"
                    onClick={deleteCurrentScreen}
                    aria-label="Delete this screen"
                    sx={{ color: "text.secondary" }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>

            {active ? (
              <ScreenAnnotator
                key={active.id}
                screen={active}
                onScreenUpdated={handleScreenUpdated}
                readOnly={!editable}
              />
            ) : null}
          </Stack>
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

function ScreenLabelInput({
  screen,
  onUpdated,
}: {
  screen: ScreenWithRegions;
  onUpdated: (next: ScreenWithRegions) => void;
}) {
  const [draft, setDraft] = useState(screen.label ?? "");

  const persist = async () => {
    const trimmed = draft.trim();
    if ((screen.label ?? "") === trimmed) return;
    const res = await fetch(`/api/screens/${screen.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: trimmed || null }),
    });
    if (!res.ok) return;
    onUpdated({ ...screen, label: trimmed || null });
  };

  return (
    <TextField
      size="small"
      label="Screen label"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={persist}
      placeholder="e.g. Dashboard / Overview"
      slotProps={{ inputLabel: { shrink: true } }}
      sx={{ minWidth: 220, maxWidth: 320 }}
    />
  );
}
