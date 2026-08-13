"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import ButtonGroup from "@mui/material/ButtonGroup";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { AddScreenDialog } from "@/components/screen/add-screen-dialog";
import { PresentMode } from "./present-mode";
import { CommandPalette, type PaletteAction } from "./command-palette";
import { ScreenAnnotator } from "@/components/screen/screen-annotator";
import { ScreenSidebar } from "@/components/screen/screen-sidebar";
import { ScreenUploader } from "@/components/screen/screen-uploader";
import { UserMenu } from "@/components/app/user-menu";
import type {
  Board,
  RegionState,
  ScreenWithRegions,
  ShareLink,
  UserRef,
} from "@/lib/types";
import { REGION_STATES, attributionName } from "@/lib/types";
import { STATE_META } from "@/lib/state-meta";
import { timeAgo } from "@/lib/time";
import type { CurrentMember } from "@/lib/auth";

interface BoardEditorProps {
  board: Board;
  initialScreens: ScreenWithRegions[];
  initialShareLinks: ShareLink[];
  viewer: CurrentMember;
  /** Author id → identity, for the "who wrote this" attribution lines. */
  authors: Record<string, UserRef>;
  /** Server render time, so relative-time labels don't need a client clock. */
  now: number;
}

const canEdit = (role: CurrentMember["role"]) =>
  role === "owner" || role === "editor";

export function BoardEditor({
  board,
  initialScreens,
  initialShareLinks,
  viewer,
  authors,
  now,
}: BoardEditorProps) {
  const [boardName, setBoardName] = useState(board.name);
  const [screens, setScreens] = useState<ScreenWithRegions[]>(initialScreens);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(initialShareLinks);
  const [activeId, setActiveId] = useState<string | null>(
    initialScreens[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filterState, setFilterState] = useState<RegionState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"upload" | "reuse">("upload");
  const [addMode, setAddMode] = useState<"add" | "replace">("add");
  const [replaceScreenId, setReplaceScreenId] = useState<string | null>(null);
  const [shareAnchorEl, setShareAnchorEl] = useState<HTMLElement | null>(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // One-shot request to select a region after jumping to its screen from the
  // command palette. Cleared once the annotator has consumed it.
  const [focusReq, setFocusReq] = useState<{
    screenId: string;
    regionId: string;
  } | null>(null);
  // "⌘" on Mac, "Ctrl" elsewhere — resolved after mount to avoid a hydration
  // mismatch on the server-rendered header.
  const [modKey, setModKey] = useState("Ctrl");

  const router = useRouter();
  const editable = canEdit(viewer.role);
  const clearFocus = useCallback(() => setFocusReq(null), []);

  // The current viewer may not appear in the server-fetched `authors` map if
  // they'd never touched this board before now. Fold their own identity in so
  // that a region they edit this session attributes to them, not "a former
  // member". The server map wins on conflict (it's equally correct there).
  const authorsWithViewer = useMemo<Record<string, UserRef>>(
    () => ({
      [viewer.user.id]: {
        id: viewer.user.id,
        name: viewer.user.name,
        email: viewer.user.email,
      },
      ...authors,
    }),
    [authors, viewer.user],
  );

  const openAddScreen = (tab: "upload" | "reuse" = "upload") => {
    setAddMode("add");
    setReplaceScreenId(null);
    setAddTab(tab);
    setAddOpen(true);
  };

  const openReplaceScreen = (screenId: string) => {
    setAddMode("replace");
    setReplaceScreenId(screenId);
    setAddTab("upload");
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

  // Move the dragged screen in front of the target, then persist the order.
  const moveScreen = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
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

  // global Cmd/Ctrl+K → toggle the command palette (works even while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // One-shot, client-only: the server has no `navigator`, and reading it
    // during render would hydration-mismatch. Runs once on mount, so it can't
    // cascade — the set-state-in-effect rule is a false positive here.
    const platform = typeof navigator !== "undefined" ? navigator.platform : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (/Mac|iPhone|iPad|iPod/.test(platform)) setModKey("⌘");
  }, []);

  // Jump handlers for the palette: switch to a screen, optionally requesting the
  // annotator to select a specific region once it mounts.
  const jumpScreen = (screenId: string) => setActiveId(screenId);
  const jumpRegion = (screenId: string, regionId: string) => {
    setActiveId(screenId);
    setFocusReq({ screenId, regionId });
  };

  const paletteActions: PaletteAction[] = [
    ...(screens.length > 0
      ? [
          {
            id: "present",
            label: "Present",
            hint: "P",
            run: () => setPresenting(true),
          },
        ]
      : []),
    ...(editable
      ? [
          {
            id: "add-screen",
            label: "Add screen",
            hint: "Action",
            run: () => openAddScreen("upload"),
          },
          {
            id: "share",
            label: "Copy share link",
            hint: "Action",
            run: () => void copyShare(),
          },
        ]
      : []),
    {
      id: "history",
      label: "Board history",
      hint: "Go",
      run: () => router.push(`/boards/${board.id}/history`),
    },
    ...(editable
      ? [
          {
            id: "settings",
            label: "Board settings",
            hint: "Go",
            run: () => router.push(`/boards/${board.id}/settings`),
          },
        ]
      : []),
  ];

  // count regions by state across all screens (status overview / filter pills)
  const totals = useMemo(() => {
    const counts = { shipped: 0, mock: 0, missing: 0 };
    for (const s of screens) {
      for (const r of s.regions) counts[r.state]++;
    }
    return counts;
  }, [screens]);

  const toggleFilter = (s: RegionState) =>
    setFilterState((cur) => (cur === s ? null : s));

  const attribution = (
    <BoardAttribution board={board} authors={authorsWithViewer} now={now} />
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      <AppHeader
        homeHref="/boards"
        crumb={boardName}
        onCrumbChange={editable ? renameBoard : undefined}
        center={
          screens.length > 0 ? (
            <SearchPill mod={modKey} onClick={() => setPaletteOpen(true)} />
          ) : undefined
        }
        actions={
          <>
            <HeaderStateFilter
              totals={totals}
              filterState={filterState}
              onToggle={toggleFilter}
            />
            {totals.shipped + totals.mock + totals.missing > 0 ? (
              <Divider
                orientation="vertical"
                flexItem
                sx={{ my: 1, borderColor: "divider" }}
              />
            ) : null}
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
              <>
                <ButtonGroup
                  variant="outlined"
                  size="small"
                  color="inherit"
                  sx={{
                    "& .MuiButtonGroup-grouped": { borderColor: "divider" },
                  }}
                >
                  <Button
                    startIcon={<ContentCopyIcon />}
                    onClick={copyShare}
                    title="Copy share link"
                  >
                    {copied ? "Copied" : "Share"}
                  </Button>
                  <Button
                    onClick={(e) => setShareAnchorEl(e.currentTarget)}
                    aria-label="More sharing options"
                    sx={{ px: 0.5, minWidth: "auto" }}
                  >
                    <ArrowDropDownIcon fontSize="small" />
                  </Button>
                </ButtonGroup>
                <Menu
                  anchorEl={shareAnchorEl}
                  open={Boolean(shareAnchorEl)}
                  onClose={() => setShareAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {activeShareLink ? (
                    <MenuItem
                      component="a"
                      href={`/share/${activeShareLink.token}`}
                      target="_blank"
                      rel="noopener"
                      onClick={() => setShareAnchorEl(null)}
                    >
                      Open share view ↗
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    component={Link}
                    href={`/boards/${board.id}/settings?section=sharing`}
                    onClick={() => setShareAnchorEl(null)}
                  >
                    Manage links…
                  </MenuItem>
                </Menu>
              </>
            ) : null}
            <Tooltip title="More board options">
              <IconButton
                size="small"
                onClick={(e) => setMoreAnchorEl(e.currentTarget)}
                aria-label="More board options"
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={moreAnchorEl}
              open={Boolean(moreAnchorEl)}
              onClose={() => setMoreAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                component={Link}
                href={`/boards/${board.id}/history`}
                onClick={() => setMoreAnchorEl(null)}
              >
                Board history
              </MenuItem>
              {editable ? (
                <MenuItem
                  component={Link}
                  href={`/boards/${board.id}/settings`}
                  onClick={() => setMoreAnchorEl(null)}
                >
                  Board settings
                </MenuItem>
              ) : null}
            </Menu>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />

      {screens.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
            p: 3,
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 540, mt: { xs: 2, sm: 6 } }}>
            <Stack spacing={1.5}>
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
                    An editor hasn&apos;t uploaded any screenshots to this
                    board.
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
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          <ScreenSidebar
            screens={screens}
            activeId={activeId}
            editable={editable}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
            onSelect={setActiveId}
            onAdd={() => openAddScreen("upload")}
            onRename={(id, label) => void renameScreen(id, label)}
            onReplace={openReplaceScreen}
            onDelete={(id) => void deleteScreenById(id)}
            onReorder={moveScreen}
            footer={attribution}
          />
          {active ? (
            <ScreenAnnotator
              key={active.id}
              screen={active}
              onScreenUpdated={handleScreenUpdated}
              onError={setActionError}
              readOnly={!editable}
              filterState={filterState}
              authors={authorsWithViewer}
              now={now}
              onWorkStart={() => setSidebarCollapsed(true)}
              focusRegionId={
                focusReq && active.id === focusReq.screenId
                  ? focusReq.regionId
                  : undefined
              }
              onFocusConsumed={clearFocus}
            />
          ) : null}
        </Box>
      )}

      {presenting ? (
        <PresentMode
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
          mode={addMode}
          replaceScreenId={replaceScreenId ?? undefined}
          onResult={(result) => {
            if (addMode === "replace") {
              const s = result[0];
              if (s) handleScreenUpdated(s);
            } else {
              handleScreensAdded(result);
            }
          }}
        />
      ) : null}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        screens={screens}
        onJumpScreen={jumpScreen}
        onJumpRegion={jumpRegion}
        actions={paletteActions}
      />
    </Box>
  );
}

/**
 * Header trigger for the command palette: a compact search field that opens the
 * palette and advertises the Cmd/Ctrl+K shortcut. On narrow screens it collapses
 * to just the icon.
 */
function SearchPill({ mod, onClick }: { mod: string; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Search this board (Ctrl or Cmd + K)"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: { xs: 0.75, sm: 1.25 },
        py: 0.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        color: "text.secondary",
        width: { sm: 240 },
        "&:hover": { borderColor: "text.primary", color: "text.primary" },
      }}
    >
      <SearchIcon fontSize="small" />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          textAlign: "left",
          display: { xs: "none", sm: "block" },
        }}
      >
        Search…
      </Typography>
      <Box
        component="span"
        sx={{
          display: { xs: "none", sm: "inline" },
          fontFamily: "monospace",
          fontSize: 11,
          px: 0.5,
          py: 0.125,
          border: 1,
          borderColor: "divider",
          borderRadius: 0.5,
        }}
      >
        {mod} K
      </Box>
    </ButtonBase>
  );
}

/**
 * Board-wide state tally that doubles as a filter, in the header. Board-level
 * view control, so it lives with the board chrome — deliberately separate from
 * the per-region editor in the inspector. Clicking a segment isolates that
 * state across the canvas; clicking again clears. Compact (color dot + count)
 * to sit unobtrusively among the header actions; hidden until a region exists.
 */
function HeaderStateFilter({
  totals,
  filterState,
  onToggle,
}: {
  totals: Record<RegionState, number>;
  filterState: RegionState | null;
  onToggle: (s: RegionState) => void;
}) {
  const total = totals.shipped + totals.mock + totals.missing;
  if (total === 0) return null;
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ mr: { sm: 0.5 }, display: { xs: "none", sm: "flex" } }}
    >
      {REGION_STATES.map((s) => {
        const isActive = filterState === s;
        const dimmed = filterState !== null && !isActive;
        return (
          <Tooltip
            key={s}
            title={
              isActive
                ? `Showing only ${s} — click to clear`
                : `Show only ${s} (${totals[s]})`
            }
          >
            <ButtonBase
              onClick={() => onToggle(s)}
              aria-pressed={isActive}
              aria-label={`${s}: ${totals[s]}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.625,
                px: 0.875,
                py: 0.375,
                borderRadius: 1,
                border: 1,
                borderColor: isActive ? "primary.main" : "divider",
                opacity: dimmed ? 0.5 : 1,
                transition: "all 120ms ease",
                "&:hover": { borderColor: "text.primary" },
              }}
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  bgcolor: STATE_META[s].color,
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {totals[s]}
              </Typography>
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

/**
 * Muted creation-attribution line ("Created by …"), pinned to the foot of the
 * screens sidebar.
 *
 * Board-level attribution is deliberately creation-only: `updated_by` on a board
 * is touched by any child change (a new screenshot, a moved region), so it
 * answers "last activity", not "who wrote the title". Naming the creator is the
 * honest line that never misattributes. Live, per-edit authorship lives on
 * regions, where `updated_by` is set on the same write as the note. Never shown
 * on the public share link — this is an editor affordance.
 */
function BoardAttribution({
  board,
  authors,
  now,
}: {
  board: Board;
  authors: Record<string, UserRef>;
  now: number;
}) {
  const creator = board.createdBy ? authors[board.createdBy] : null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block" }}
    >
      Created by {attributionName(creator)} · {timeAgo(board.createdAt, now)}
    </Typography>
  );
}
