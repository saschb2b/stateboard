"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import { AppHeader } from "./app-header";
import { AddScreenDialog } from "./add-screen-dialog";
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"upload" | "reuse">("upload");

  const editable = canEdit(viewer.role);

  const openAddScreen = (tab: "upload" | "reuse" = "upload") => {
    setAddTab(tab);
    setAddOpen(true);
  };

  // Surface a failed mutation instead of silently swallowing it. Reads the
  // API's `{ error }` body when present, falling back to a plain-language line.
  const reportFailure = async (res: Response, fallback: string) => {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setActionError(body.error ?? fallback);
  };

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

  const handleScreensAdded = (added: ScreenWithRegions[]) => {
    const last = added[added.length - 1];
    if (!last) return;
    setScreens((prev) => [...prev, ...added]);
    setActiveId(last.id);
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
    if (!res.ok) {
      await reportFailure(res, "Couldn't delete the screen.");
      return;
    }
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
    if (!res.ok) {
      await reportFailure(res, "Couldn't rename the screen.");
      return;
    }
    handleScreenUpdated({ ...screen, label: trimmed || null });
  };

  // Persist a new screen order; roll back the optimistic move on failure.
  const persistScreenOrder = async (
    next: ScreenWithRegions[],
    prev: ScreenWithRegions[],
  ) => {
    const res = await fetch(`/api/boards/${board.id}/screens`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map((s) => s.id) }),
    });
    if (!res.ok) {
      setScreens(prev);
      await reportFailure(res, "Couldn't reorder the screens.");
    }
  };

  // Drop the dragged tab in front of the target tab, then persist.
  const reorderTo = (targetId: string) => {
    const draggedId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;
    const prev = screens;
    const dragged = prev.find((s) => s.id === draggedId);
    const without = prev.filter((s) => s.id !== draggedId);
    const targetIdx = without.findIndex((s) => s.id === targetId);
    if (!dragged || targetIdx === -1) return;
    const next = [
      ...without.slice(0, targetIdx),
      dragged,
      ...without.slice(targetIdx),
    ];
    setScreens(next);
    void persistScreenOrder(next, prev);
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
      await reportFailure(res, "Couldn't rename the board.");
    }
  };

  const ensureShareLink = async (): Promise<ShareLink | null> => {
    if (activeShareLink) return activeShareLink;
    const res = await fetch(`/api/boards/${board.id}/share-links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      await reportFailure(res, "Couldn't create a share link.");
      return null;
    }
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
        homeHref="/boards"
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
                  aria-label="Open share view in a new tab"
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
              <Stack spacing={1}>
                <ScreenUploader
                  boardId={board.id}
                  onUploaded={handleUploaded}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  or{" "}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => openAddScreen("reuse")}
                    sx={{
                      p: 0,
                      border: 0,
                      bgcolor: "transparent",
                      cursor: "pointer",
                      font: "inherit",
                      color: "primary.main",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    reuse a screenshot from another board
                  </Box>
                </Typography>
              </Stack>
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
                    draggable={editable && renamingId !== s.id}
                    onDragStart={(e) => {
                      setDragId(s.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (!dragId || dragId === s.id) return;
                      e.preventDefault();
                      setDragOverId(s.id);
                    }}
                    onDragLeave={() =>
                      setDragOverId((cur) => (cur === s.id ? null : cur))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      reorderTo(s.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    onDoubleClick={
                      editable ? () => setRenamingId(s.id) : undefined
                    }
                    sx={{
                      opacity: dragId === s.id ? 0.4 : 1,
                      boxShadow:
                        dragOverId === s.id
                          ? "inset 3px 0 0 var(--mui-palette-primary-main)"
                          : "none",
                      cursor:
                        editable && renamingId !== s.id ? "grab" : undefined,
                      transition: "opacity 120ms ease",
                    }}
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
                <Button
                  startIcon={<AddPhotoAlternateOutlinedIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => openAddScreen("upload")}
                >
                  Add screen
                </Button>
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
                onError={setActionError}
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
      <Snackbar
        open={actionError !== null}
        autoHideDuration={6000}
        onClose={() => setActionError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setActionError(null)}
          sx={{ width: "100%" }}
        >
          {actionError}
        </Alert>
      </Snackbar>
      {editable && addOpen ? (
        <AddScreenDialog
          open
          onClose={() => setAddOpen(false)}
          boardId={board.id}
          initialTab={addTab}
          onAdded={handleScreensAdded}
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
