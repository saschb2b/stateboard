"use client";

import { useTranslations, useFormatter } from "next-intl";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { AddScreenDialog } from "@/components/screen/add-screen-dialog";
import { PresentMode } from "./present-mode";
import { CommandPalette, type PaletteAction } from "./command-palette";
import { ScreenAnnotator } from "@/components/screen/screen-annotator";
import { RegionFeatureLinks } from "@/components/screen/region-feature-links";
import type {
  Capability,
  ProductContext,
  RegionCapability,
} from "@/lib/release-types";
import type { ScreenEditorContext } from "@/lib/screen-editor-context";
import { ScreenEditorToolbar } from "@/components/screen/screen-editor-toolbar";
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
import { attributionName } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";
import { isInteractiveKeyEvent } from "@/lib/keyboard-shortcuts";
import { clientRequest } from "@/lib/client-request";
import { createMutationQueue } from "@/lib/mutation-queue";
import { applySavedOrder } from "@/lib/screen-order";

interface BoardEditorProps {
  board: Board;
  initialCapabilities?: Capability[];
  initialRegionCapabilities?: RegionCapability[];
  initialContext?: ScreenEditorContext;
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
  initialCapabilities = [],
  initialRegionCapabilities = [],
  initialContext = {},
  viewer,
  authors,
  now,
}: BoardEditorProps) {
  const t = useTranslations("Visual");
  const common = useTranslations("Common");
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("sm"));
  const [enqueueMutation] = useState(createMutationQueue);
  const orderVersion = useRef(0);
  const savedScreenOrder = useRef(initialScreens.map((screen) => screen.id));
  const shareCreation = useRef<Promise<ShareLink | null> | null>(null);
  const [features, setFeatures] = useState({
    capabilities: initialCapabilities,
    links: initialRegionCapabilities,
  });
  const [screens, setScreens] = useState<ScreenWithRegions[]>(initialScreens);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(initialShareLinks);
  const [activeId, setActiveId] = useState<string | null>(
    initialContext.screenId ?? initialScreens[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(
    null,
  );
  const sidebarCollapsed = sidebarPreference ?? narrow;
  const [filterState, setFilterState] = useState<RegionState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"upload" | "reuse">("upload");
  const [addMode, setAddMode] = useState<"add" | "replace">("add");
  const [replaceScreenId, setReplaceScreenId] = useState<string | null>(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // One-shot request to select a region after jumping to its screen from the
  // command palette. Cleared once the annotator has consumed it.
  const [focusReq, setFocusReq] = useState<{
    screenId: string;
    regionId: string;
  } | null>(
    initialContext.screenId && initialContext.regionId
      ? { screenId: initialContext.screenId, regionId: initialContext.regionId }
      : null,
  );

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

  const reportFailure = (cause: unknown, fallback: string) => {
    setActionError(cause instanceof Error ? cause.message : fallback);
  };

  const active = useMemo(
    () => screens.find((s) => s.id === activeId) ?? null,
    [screens, activeId],
  );

  const activeShareLink = useMemo(
    () => shareLinks.find((l) => l.revokedAt === null) ?? null,
    [shareLinks],
  );

  const changeRegionFeature = async (
    regionId: string,
    capabilityId: string,
    linked: boolean,
  ) => {
    if (!editable) return;
    const product = await enqueueMutation("region-features", () =>
      clientRequest<ProductContext>(`/api/boards/${board.id}/product`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: linked ? "region_capability.put" : "region_capability.delete",
          data: { regionId, capabilityId },
        }),
      }),
    );
    setFeatures({
      capabilities: product.capabilities,
      links: product.regionCapabilities,
    });
  };

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
      !confirm(t("deleteScreenConfirmation", { count: screen.regions.length }))
    ) {
      return;
    }
    try {
      await enqueueMutation(`screen:${id}`, () =>
        clientRequest(`/api/screens/${id}`, { method: "DELETE" }),
      );
      handleScreenDeleted(id);
    } catch (cause) {
      reportFailure(cause, t("deleteScreenError"));
    }
  };

  const renameScreen = async (id: string, label: string) => {
    const trimmed = label.trim();
    const screen = screens.find((s) => s.id === id);
    if (!screen || (screen.label ?? "") === trimmed) return;
    try {
      await enqueueMutation(`screen:${id}`, () =>
        clientRequest(`/api/screens/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label: trimmed || null }),
        }),
      );
      setScreens((current) =>
        current.map((screen) =>
          screen.id === id ? { ...screen, label: trimmed || null } : screen,
        ),
      );
    } catch (cause) {
      reportFailure(cause, t("renameScreenError"));
    }
  };

  const persistScreenOrder = async (next: ScreenWithRegions[]) => {
    const version = ++orderVersion.current;
    const order = next.map((screen) => screen.id);
    try {
      await enqueueMutation("screen-order", () =>
        clientRequest(`/api/boards/${board.id}/screens`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order }),
        }),
      );
      savedScreenOrder.current = order;
    } catch (cause) {
      if (version === orderVersion.current)
        setScreens((current) =>
          applySavedOrder(current, savedScreenOrder.current),
        );
      reportFailure(cause, t("reorderScreensError"));
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
    void persistScreenOrder(next);
  };

  const ensureShareLink = async (): Promise<ShareLink | null> => {
    if (activeShareLink) return activeShareLink;
    if (shareCreation.current) return shareCreation.current;
    const create = async () => {
      try {
        const link = await clientRequest<ShareLink>(
          `/api/boards/${board.id}/share-links`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          },
        );
        setShareLinks((prev) => [link, ...prev]);
        return link;
      } catch (cause) {
        reportFailure(cause, t("createShareLinkError"));
        return null;
      }
    };
    shareCreation.current = create();
    try {
      return await shareCreation.current;
    } finally {
      shareCreation.current = null;
    }
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
      setActionError(t("copyLinkManualError"));
    }
  };

  // global "P" shortcut → enter presentation mode (skipped while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "p" && e.key !== "P") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInteractiveKeyEvent(e)) return;
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
            label: t("present"),
            hint: "P",
            run: () => setPresenting(true),
          },
        ]
      : []),
    ...(editable
      ? [
          {
            id: "add-screen",
            label: t("addScreen"),
            hint: t("action"),
            run: () => openAddScreen("upload"),
          },
          {
            id: "share",
            label: t("copyShareLink"),
            hint: t("action"),
            run: () => void copyShare(),
          },
        ]
      : []),
    {
      id: "release-readiness",
      label: t("releaseReadiness"),
      hint: t("go"),
      run: () => router.push(`/boards/${board.id}/releases`),
    },
    {
      id: "history",
      label: t("boardHistory"),
      hint: t("go"),
      run: () => router.push(`/boards/${board.id}/history`),
    },
    ...(editable
      ? [
          {
            id: "settings",
            label: common("editBoard"),
            hint: t("go"),
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
        breadcrumbs={[
          { label: common("boards"), href: "/boards" },
          { label: board.name, href: `/boards/${board.id}/releases` },
          {
            label: t("screens"),
            href: `/boards/${board.id}/releases?section=screens`,
          },
          { label: t("screenEditor") },
        ]}
        actions={
          <>
            <Tooltip title={t("moreBoardOptions")}>
              <IconButton
                size="small"
                onClick={(event) => setMoreAnchorEl(event.currentTarget)}
                aria-label={t("moreBoardOptions")}
                aria-haspopup="menu"
                aria-expanded={Boolean(moreAnchorEl)}
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
                href={`/boards/${board.id}/releases`}
                onClick={() => setMoreAnchorEl(null)}
              >
                {t("releaseReadiness")}
              </MenuItem>
              <MenuItem
                component={Link}
                href={`/boards/${board.id}/history`}
                onClick={() => setMoreAnchorEl(null)}
              >
                {t("boardHistory")}
              </MenuItem>
              {editable ? (
                <MenuItem
                  component={Link}
                  href={`/boards/${board.id}/settings`}
                  onClick={() => setMoreAnchorEl(null)}
                >
                  {common("editBoard")}
                </MenuItem>
              ) : null}
            </Menu>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      {active ? (
        <ScreenEditorToolbar
          name={
            active.label ||
            t("screenNumber", {
              number:
                screens.findIndex((screen) => screen.id === active.id) + 1,
            })
          }
          regionCount={active.regions.length}
          readOnly={!editable}
          totals={totals}
          filterState={filterState}
          onFilter={toggleFilter}
          onSearch={() => setPaletteOpen(true)}
          onPresent={() => setPresenting(true)}
          onCopyShare={() => void copyShare()}
          copied={copied}
          shareHref={
            activeShareLink ? `/share/${activeShareLink.token}` : undefined
          }
          sharingSettingsHref={`/boards/${board.id}/settings?section=sharing`}
          reviewHref={initialContext.review?.href}
        />
      ) : null}

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
              {initialContext.review ? (
                <Button
                  component={Link}
                  href={initialContext.review.href}
                  size="small"
                  color="inherit"
                  startIcon={<ArrowBackIcon />}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {t("backToReleaseReview")}
                </Button>
              ) : null}
              {editable ? (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography component="h1" variant="h6">
                    {t("noScreens")}
                  </Typography>
                  <Button
                    component={Link}
                    href={`/boards/${board.id}/settings`}
                    size="small"
                    color="inherit"
                    sx={{ flexShrink: 0 }}
                  >
                    {common("editBoard")}
                  </Button>
                </Stack>
              ) : null}
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
                    {t("or")}
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
                      {t("reuseScreenshot")}
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
                    {t("noScreens")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("noScreensEditor")}
                  </Typography>
                </Box>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                {t("uploadHelp")}{" "}
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
                  {t("seeExampleBoard")}
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
            onToggleCollapsed={() => setSidebarPreference(!sidebarCollapsed)}
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
              renderRegionDetails={(region) => (
                <RegionFeatureLinks
                  key={region.id}
                  regionId={region.id}
                  capabilities={features.capabilities}
                  links={features.links}
                  readOnly={!editable}
                  preferredCapabilityId={initialContext.capabilityId}
                  onChange={changeRegionFeature}
                />
              )}
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
          boardName={board.name}
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
  const t = useTranslations("Visual");
  const format = useFormatter();
  const creator = board.createdBy ? authors[board.createdBy] : null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block" }}
    >
      {t("createdBy", {
        name: creator ? attributionName(creator) : t("formerMember"),
        time: format.relativeTime(board.createdAt, now),
      })}
    </Typography>
  );
}
