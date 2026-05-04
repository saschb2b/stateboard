"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { AppHeader } from "./app-header";
import { BoardPresenter } from "./board-presenter";
import { ScreenAnnotator } from "./screen-annotator";
import { ScreenUploader } from "./screen-uploader";
import { StateChip } from "./state-chip";
import { UserMenu } from "./user-menu";
import type {
  Board,
  RegionState,
  ScreenWithRegions,
  ShareLink,
} from "@/lib/types";
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
  const [boardName, setBoardName] = useState(board.name);
  const [screens, setScreens] = useState<ScreenWithRegions[]>(initialScreens);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(initialShareLinks);
  const [activeId, setActiveId] = useState<string | null>(
    initialScreens[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<RegionState | null>(null);

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

  const deleteScreenById = async (id: string) => {
    const screen = screens.find((s) => s.id === id);
    if (!screen) return;
    if (
      !confirm(`Delete this screen and its ${screen.regions.length} region(s)?`)
    ) {
      return;
    }
    const res = await fetch(`/api/screens/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    handleScreenDeleted(id);
  };

  const renameScreen = async (id: string, label: string) => {
    const trimmed = label.trim();
    const screen = screens.find((s) => s.id === id);
    if (!screen) return;
    if ((screen.label ?? "") === trimmed) return;
    const res = await fetch(`/api/screens/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: trimmed || null }),
    });
    if (!res.ok) return;
    handleScreenUpdated({ ...screen, label: trimmed || null });
  };

  const renameBoard = async (next: string) => {
    setBoardName(next); // optimistic so the input doesn't snap back
    const res = await fetch(`/api/boards/${board.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (!res.ok) {
      setBoardName(board.name); // revert on failure
    }
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

  // count regions by state across all screens (status overview / filter pills)
  const totals = useMemo(() => {
    const counts = { shipped: 0, mock: 0, missing: 0 };
    for (const s of screens) {
      for (const r of s.regions) counts[r.state]++;
    }
    return counts;
  }, [screens]);

  const totalRegions = totals.shipped + totals.mock + totals.missing;

  const toggleFilter = (s: RegionState) =>
    setFilterState((cur) => (cur === s ? null : s));

  return (
    <>
      <AppHeader
        crumb={boardName}
        onCrumbChange={editable ? renameBoard : undefined}
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
            {editable ? (
              <Tooltip title={copied ? "Copied!" : "Copy share link"}>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={copyShare}
                  variant="outlined"
                  color="inherit"
                  sx={{ borderColor: "divider" }}
                >
                  {copied ? "Copied" : "Share"}
                </Button>
              </Tooltip>
            ) : null}
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
            {/* Single editor chrome row: tabs (each editable + closable) ·
                add screen · state filter pills. The screen name is
                canonical on the tab — no separate label input. Edit
                affordances are suppressed for viewer-role members. */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ flexWrap: "wrap", rowGap: 1 }}
            >
              <Tabs
                value={activeId}
                onChange={(_, v) => {
                  if (renamingId) return; // don't switch tabs while renaming
                  setActiveId(v as string);
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 40,
                  "& .MuiTab-root": {
                    minHeight: 40,
                    py: 0.5,
                    pr: 1,
                    textTransform: "none",
                    fontWeight: 600,
                  },
                }}
              >
                {screens.map((s, i) => (
                  <Tab
                    key={s.id}
                    value={s.id}
                    onDoubleClick={
                      editable ? () => setRenamingId(s.id) : undefined
                    }
                    label={
                      editable && renamingId === s.id ? (
                        <TabRenameField
                          initial={s.label ?? ""}
                          placeholder={`Screen ${i + 1}`}
                          onCommit={(next) => {
                            setRenamingId(null);
                            void renameScreen(s.id, next);
                          }}
                          onCancel={() => setRenamingId(null)}
                        />
                      ) : (
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <Box component="span">
                            {s.label || `Screen ${i + 1}`}
                          </Box>
                          {editable && s.id === activeId ? (
                            <Tooltip title="Delete this screen">
                              <ButtonBase
                                component="span"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteScreenById(s.id);
                                }}
                                aria-label="Delete this screen"
                                sx={{
                                  ml: 0.5,
                                  p: 0.25,
                                  borderRadius: 0.5,
                                  display: "inline-flex",
                                  color: "text.secondary",
                                  "&:hover": {
                                    bgcolor: "action.hover",
                                    color: "error.main",
                                  },
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 14 }} />
                              </ButtonBase>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      )
                    }
                  />
                ))}
              </Tabs>

              {editable ? (
                <ScreenUploader
                  boardId={board.id}
                  onUploaded={handleUploaded}
                  compact
                />
              ) : null}

              <Box sx={{ flex: 1 }} />

              {totalRegions > 0
                ? REGION_STATES.map((s) => {
                    const isActive = filterState === s;
                    const dimmed = filterState !== null && !isActive;
                    return (
                      <Tooltip
                        key={s}
                        title={
                          isActive
                            ? "Click to clear filter"
                            : `Show only ${s} regions`
                        }
                      >
                        <ButtonBase
                          onClick={() => toggleFilter(s)}
                          aria-pressed={isActive}
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            border: 1,
                            borderColor: isActive ? "primary.main" : "divider",
                            borderRadius: 1,
                            opacity: dimmed ? 0.4 : 1,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            transition: "all 120ms ease",
                            "&:hover": { borderColor: "text.primary" },
                          }}
                        >
                          <StateChip state={s} size="sm" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {totals[s]}
                          </Typography>
                        </ButtonBase>
                      </Tooltip>
                    );
                  })
                : null}
            </Stack>

            {active ? (
              <ScreenAnnotator
                key={active.id}
                screen={active}
                onScreenUpdated={handleScreenUpdated}
                readOnly={!editable}
                filterState={filterState}
              />
            ) : null}
          </Stack>
        )}
      </Container>
      {presenting ? (
        <BoardPresenter
          boardName={boardName}
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

/**
 * Inline rename field used inside an MUI Tab's label slot.
 *
 * MUI Tab is a button — pointer events on a child input bubble up and
 * confuse focus, so we stop propagation on mousedown/click here.
 */
function TabRenameField({
  initial,
  placeholder,
  onCommit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <InputBase
      inputRef={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      autoFocus
      sx={{
        color: "text.primary",
        fontWeight: 600,
        fontSize: "0.875rem",
        minWidth: 120,
        "& input": {
          p: 0.25,
          px: 0.5,
          borderRadius: 0.5,
          bgcolor: "action.hover",
        },
      }}
    />
  );
}
