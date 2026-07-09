"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import { StateChip } from "./state-chip";
import {
  fuzzyScore,
  screenName,
  searchBoard,
  type RegionHit,
  type SnippetPart,
} from "@/lib/search";
import type { RegionState, ScreenWithRegions } from "@/lib/types";

export interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  screens: ScreenWithRegions[];
  onJumpScreen: (screenId: string) => void;
  onJumpRegion: (screenId: string, regionId: string) => void;
  actions: PaletteAction[];
}

type FlatItem =
  | { kind: "screen"; key: string; screenId: string; name: string }
  | {
      kind: "region";
      key: string;
      screenId: string;
      regionId: string;
      label: string | null;
      state: RegionState;
      owner: string;
      snippet: SnippetPart[] | null;
    }
  | { kind: "action"; key: string; action: PaletteAction };

interface Group {
  label: string;
  items: FlatItem[];
}

/**
 * Board-scoped command palette (Ctrl/Cmd+K). A quick navigational jumper: fuzzy
 * match a screen by name, or a region by its label or a phrase you remember from
 * its notes, and jump straight there. A short Actions group rounds it out.
 *
 * Everything runs over the board's already-loaded screens/regions, so results
 * are instant and nothing leaves the page. Keyboard-first: ↑↓ to move, ↵ to
 * jump, esc to close.
 */
export function CommandPalette({
  open,
  onClose,
  screens,
  onJumpScreen,
  onJumpRegion,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset to a fresh, empty query each time the palette opens — done during
  // render (not in an effect) so there's no flash of the previous search.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const groups: Group[] = useMemo(() => {
    const needle = query.trim();
    const out: Group[] = [];

    if (needle) {
      const { screens: screenHits, regions: regionHits } = searchBoard(
        screens,
        needle,
      );
      if (screenHits.length) {
        out.push({
          label: "Screens",
          items: screenHits.map((h) => ({
            kind: "screen",
            key: `screen:${h.screenId}`,
            screenId: h.screenId,
            name: h.name,
          })),
        });
      }
      if (regionHits.length) {
        out.push({ label: "Regions", items: regionHits.map(regionItem) });
      }
      const actionHits = actions
        .map((a) => ({ a, score: fuzzyScore(a.label, needle) }))
        .filter(({ score }) => score >= 0)
        .sort((x, y) => y.score - x.score)
        .map(({ a }) => a);
      if (actionHits.length) {
        out.push({ label: "Actions", items: actionHits.map(actionItem) });
      }
    } else {
      // Zero-query: the palette doubles as a screen switcher + command list.
      if (screens.length) {
        out.push({
          label: "Screens",
          items: screens.map((s, i) => ({
            kind: "screen",
            key: `screen:${s.id}`,
            screenId: s.id,
            name: screenName(s, i),
          })),
        });
      }
      if (actions.length) {
        out.push({ label: "Actions", items: actions.map(actionItem) });
      }
    }
    return out;
  }, [query, screens, actions]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Keep the active row in view as it moves.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, flat.length]);

  const activate = (item: FlatItem) => {
    if (item.kind === "screen") {
      onJumpScreen(item.screenId);
      onClose();
    } else if (item.kind === "region") {
      onJumpRegion(item.screenId, item.regionId);
      onClose();
    } else {
      onClose();
      item.action.run();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) activate(item);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(0, flat.length - 1));
    }
  };

  // Running index across groups so the active row lines up with `flat`.
  let running = -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
      slotProps={{ paper: { sx: { mt: "12vh", overflow: "hidden" } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
      >
        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a screen, or search a region's label or notes…"
          sx={{ fontSize: "1rem" }}
        />
      </Stack>

      <List
        ref={listRef}
        dense
        sx={{ maxHeight: "56vh", overflowY: "auto", py: 0 }}
      >
        {flat.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No matches.
            </Typography>
          </Box>
        ) : (
          groups.map((group) => (
            <li key={group.label}>
              <ul style={{ padding: 0, listStyle: "none" }}>
                <ListSubheader
                  disableSticky
                  sx={{
                    bgcolor: "transparent",
                    lineHeight: 2,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                  }}
                >
                  {group.label}
                </ListSubheader>
                {group.items.map((item) => {
                  running += 1;
                  const index = running;
                  const isActive = index === activeIndex;
                  return (
                    <ListItemButton
                      key={item.key}
                      data-active={isActive || undefined}
                      selected={isActive}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => activate(item)}
                      sx={{ px: 2, py: 0.75, gap: 1.25 }}
                    >
                      <PaletteRow item={item} />
                    </ListItemButton>
                  );
                })}
              </ul>
            </li>
          ))
        )}
      </List>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: "divider",
          color: "text.secondary",
        }}
      >
        <Hint keys="↑↓" label="navigate" />
        <Hint keys="↵" label="jump" />
        <Hint keys="esc" label="close" />
      </Stack>
    </Dialog>
  );
}

function regionItem(h: RegionHit): FlatItem {
  return {
    kind: "region",
    key: `region:${h.regionId}`,
    screenId: h.screenId,
    regionId: h.regionId,
    label: h.label,
    state: h.state,
    owner: h.screenName,
    snippet: h.snippet,
  };
}

function actionItem(a: PaletteAction): FlatItem {
  return { kind: "action", key: `action:${a.id}`, action: a };
}

/** One result row. Screens carry an image icon, regions a state chip + owning
 *  screen (and a notes snippet when matched there), actions a bolt + hint. */
function PaletteRow({ item }: { item: FlatItem }) {
  if (item.kind === "screen") {
    return (
      <>
        <ImageOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {item.name}
        </Typography>
      </>
    );
  }
  if (item.kind === "region") {
    return (
      <>
        <StateChip state={item.state} size="sm" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontWeight: 600,
                fontStyle: item.label ? "normal" : "italic",
                color: item.label ? "text.primary" : "text.secondary",
              }}
            >
              {item.label || "Untitled region"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {item.owner}
            </Typography>
          </Stack>
          {item.snippet ? (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: "block" }}
            >
              {item.snippet.map((part, i) =>
                part.match ? (
                  <Box
                    key={i}
                    component="mark"
                    sx={{
                      bgcolor: "transparent",
                      color: "text.primary",
                      fontWeight: 700,
                    }}
                  >
                    {part.text}
                  </Box>
                ) : (
                  <Box component="span" key={i}>
                    {part.text}
                  </Box>
                ),
              )}
            </Typography>
          ) : null}
        </Box>
      </>
    );
  }
  return (
    <>
      <BoltOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
      <Typography variant="body2" sx={{ flex: 1 }} noWrap>
        {item.action.label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {item.action.hint}
      </Typography>
    </>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box
        component="span"
        sx={{
          fontFamily: "monospace",
          fontSize: 11,
          px: 0.5,
          py: 0.125,
          border: 1,
          borderColor: "divider",
          borderRadius: 0.5,
        }}
      >
        {keys}
      </Box>
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}
