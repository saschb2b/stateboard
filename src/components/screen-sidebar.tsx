"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { STATE_META } from "@/lib/state-meta";
import type { ScreenWithRegions } from "@/lib/types";

const EXPANDED_WIDTH = 240;
const RAIL_WIDTH = 64;

interface ScreenSidebarProps {
  screens: ScreenWithRegions[];
  activeId: string | null;
  editable: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, label: string) => void;
  onReplace: (id: string) => void;
  onDelete: (id: string) => void;
  /** Move the dragged screen in front of the target screen, then persist. */
  onReorder: (draggedId: string, targetId: string) => void;
  /** Board-level meta (attribution) pinned to the sidebar foot. */
  footer?: React.ReactNode;
}

/**
 * Left rail of screens. A vertical list scales with the count where the old
 * horizontal tab row didn't, and each entry carries a thumbnail with its region
 * boxes painted on — a mini-map of the annotated screen, so state colors read at
 * a glance. Collapses to a thumbnails-only rail to hand the canvas more room.
 *
 * Per-screen actions (rename, replace image, delete) live in a kebab menu so
 * they're discoverable; reorder is drag, and double-click still renames inline.
 * All edit affordances are suppressed for viewer-role members.
 */
export function ScreenSidebar({
  screens,
  activeId,
  editable,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onAdd,
  onRename,
  onReplace,
  onDelete,
  onReorder,
  footer,
}: ScreenSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; id: string } | null>(
    null,
  );

  const drop = (targetId: string) => {
    const draggedId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (draggedId && draggedId !== targetId) onReorder(draggedId, targetId);
  };

  return (
    <Box
      component="aside"
      aria-label="Screens"
      sx={{
        width: collapsed ? RAIL_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "width 160ms ease",
      }}
    >
      {/* header: label + collapse toggle, then the add-screen action */}
      <Box sx={{ p: collapsed ? 1 : 1.5, pb: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={collapsed ? "center" : "space-between"}
          sx={{ mb: 1 }}
        >
          {collapsed ? null : (
            <Stack direction="row" alignItems="baseline" spacing={0.75}>
              <Typography variant="overline" sx={{ fontWeight: 700 }}>
                Screens
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {screens.length}
              </Typography>
            </Stack>
          )}
          <Tooltip title={collapsed ? "Expand screens" : "Collapse screens"}>
            <IconButton
              size="small"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand screens" : "Collapse screens"}
            >
              {collapsed ? (
                <ChevronRightIcon fontSize="small" />
              ) : (
                <ChevronLeftIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>

        {editable ? (
          collapsed ? (
            <Tooltip title="Add screen" placement="right">
              <IconButton
                size="small"
                onClick={onAdd}
                aria-label="Add screen"
                sx={{
                  width: "100%",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <AddPhotoAlternateOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<AddPhotoAlternateOutlinedIcon />}
              onClick={onAdd}
              sx={{ borderColor: "divider", justifyContent: "flex-start" }}
            >
              Add screen
            </Button>
          )
        ) : null}
      </Box>

      {/* scrollable list */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: collapsed ? 1 : 1.5,
          pb: 1,
        }}
      >
        <Stack spacing={0.75}>
          {screens.map((s, i) => {
            const isActive = s.id === activeId;
            const isRenaming = renamingId === s.id;
            const name = s.label || `Screen ${i + 1}`;
            return (
              <Box
                key={s.id}
                draggable={editable && !isRenaming}
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
                  drop(s.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOverId(null);
                }}
                onClick={() => onSelect(s.id)}
                onDoubleClick={editable ? () => setRenamingId(s.id) : undefined}
                sx={{
                  position: "relative",
                  p: collapsed ? 0.5 : 1,
                  borderRadius: 1,
                  cursor: editable && !isRenaming ? "grab" : "pointer",
                  bgcolor: isActive ? "action.selected" : "transparent",
                  outline: isActive ? "1px solid" : "1px solid transparent",
                  outlineColor: isActive ? "divider" : "transparent",
                  opacity: dragId === s.id ? 0.4 : 1,
                  boxShadow:
                    dragOverId === s.id
                      ? "inset 0 3px 0 var(--mui-palette-primary-main)"
                      : "none",
                  "&:hover": {
                    bgcolor: isActive ? "action.selected" : "action.hover",
                  },
                  "&:hover .screen-kebab": { opacity: 1 },
                  transition: "background-color 120ms ease, opacity 120ms ease",
                }}
              >
                {/* accent bar on the active screen */}
                {isActive ? (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: 2,
                      bgcolor: "primary.main",
                    }}
                  />
                ) : null}

                <Tooltip
                  title={collapsed ? name : ""}
                  placement="right"
                  disableHoverListener={!collapsed}
                >
                  <Box>
                    <ScreenThumb screen={s} />
                  </Box>
                </Tooltip>

                {collapsed ? null : (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ mt: 0.75 }}
                  >
                    {isRenaming ? (
                      <RenameField
                        initial={s.label ?? ""}
                        placeholder={`Screen ${i + 1}`}
                        onCommit={(next) => {
                          setRenamingId(null);
                          onRename(s.id, next);
                        }}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: isActive ? 600 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: s.label ? "text.primary" : "text.secondary",
                        }}
                      >
                        {name}
                      </Typography>
                    )}
                    {editable && !isRenaming ? (
                      <IconButton
                        className="screen-kebab"
                        size="small"
                        aria-label={`Actions for ${name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu({ el: e.currentTarget, id: s.id });
                        }}
                        sx={{
                          p: 0.25,
                          opacity: isActive ? 0.8 : 0,
                          transition: "opacity 120ms ease",
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    ) : null}
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* board meta, pinned to the foot */}
      {collapsed || !footer ? null : (
        <Box sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: "divider" }}>
          {footer}
        </Box>
      )}

      {/* per-screen action menu */}
      <Menu
        anchorEl={menu?.el ?? null}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            const id = menu?.id;
            setMenu(null);
            if (id) setRenamingId(id);
          }}
        >
          <ListItemIcon>
            <DriveFileRenameOutlineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const id = menu?.id;
            setMenu(null);
            if (id) onReplace(id);
          }}
        >
          <ListItemIcon>
            <SwapHorizOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Replace image</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const id = menu?.id;
            setMenu(null);
            if (id) onDelete(id);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

/**
 * A screen's thumbnail with its region boxes painted on. The box's aspect ratio
 * matches the screenshot, so the normalized region coordinates line up exactly —
 * it's the annotated screen in miniature.
 */
function ScreenThumb({ screen }: { screen: ScreenWithRegions }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: `${screen.width} / ${screen.height}`,
        borderRadius: 0.75,
        overflow: "hidden",
        bgcolor: "background.default",
        border: 1,
        borderColor: "divider",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screen.mediaUrl}
        alt=""
        loading="lazy"
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />
      {screen.regions.map((r) => (
        <Box
          key={r.id}
          sx={{
            position: "absolute",
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.w * 100}%`,
            height: `${r.h * 100}%`,
            bgcolor: STATE_META[r.state].fill,
            border: `1px solid ${STATE_META[r.state].color}`,
            borderRadius: "1px",
          }}
        />
      ))}
    </Box>
  );
}

/** Inline rename field for a screen entry (double-click or kebab → Rename). */
function RenameField({
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
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      autoFocus
      placeholder={placeholder}
      sx={{
        flex: 1,
        fontSize: "0.875rem",
        fontWeight: 500,
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
