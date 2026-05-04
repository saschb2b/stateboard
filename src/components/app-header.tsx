"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

interface AppHeaderProps {
  /** Optional right-side slot for page-specific actions (Save, Share, etc). */
  actions?: React.ReactNode;
  /** Optional crumb shown after the wordmark, e.g. board name in editor. */
  crumb?: string;
  /**
   * When provided, the crumb becomes inline-editable: click to edit,
   * blur or Enter to save, Escape to cancel. Empty values are rejected.
   */
  onCrumbChange?: (next: string) => void;
}

/**
 * Universal top bar.
 *
 * The orange square + wordmark mirrors the pitch deck identity: the small
 * filled square next to "STATEBOARD" is the brand mark, not decoration.
 */
export function AppHeader({ actions, crumb, onCrumbChange }: AppHeaderProps) {
  return (
    <AppBar position="sticky">
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 60 },
          gap: 2,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              aria-hidden
              sx={{
                width: 14,
                height: 14,
                bgcolor: "primary.main",
                borderRadius: 0.5,
              }}
            />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
            >
              STATEBOARD
            </Typography>
          </Stack>
        </Link>
        {crumb ? (
          <>
            <Typography
              component="span"
              sx={{ color: "text.secondary", mx: 1 }}
              aria-hidden
            >
              /
            </Typography>
            {onCrumbChange ? (
              <EditableCrumb value={crumb} onCommit={onCrumbChange} />
            ) : (
              <Typography
                variant="subtitle1"
                noWrap
                sx={{ color: "text.secondary", fontWeight: 500, flex: 1 }}
              >
                {crumb}
              </Typography>
            )}
          </>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
        {actions ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {actions}
          </Stack>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}

function EditableCrumb({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === value) return;
    onCommit(trimmed);
  };

  if (editing) {
    return (
      <InputBase
        inputRef={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        autoFocus
        sx={{
          flex: 1,
          color: "text.primary",
          fontWeight: 500,
          fontSize: "1rem",
          "& input": { p: 0.25, px: 0.5, borderRadius: 0.5 },
          "& input:focus": { bgcolor: "action.hover", outline: "none" },
        }}
      />
    );
  }

  return (
    <Typography
      variant="subtitle1"
      noWrap
      onClick={startEditing}
      title="Click to rename"
      sx={{
        color: "text.secondary",
        fontWeight: 500,
        flex: 1,
        cursor: "text",
        px: 0.5,
        borderRadius: 0.5,
        "&:hover": { color: "text.primary", bgcolor: "action.hover" },
        transition: "color 120ms ease, background-color 120ms ease",
      }}
    >
      {value}
    </Typography>
  );
}
