"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";
import type { Board } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

export interface BoardListItem {
  board: Board;
  /** Most-recent active share-link token, or null if none. */
  shareToken: string | null;
}

interface BoardListProps {
  initialItems: BoardListItem[];
  viewer: CurrentMember;
}

const canEdit = (role: CurrentMember["role"]) =>
  role === "owner" || role === "editor";

export function BoardList({ initialItems, viewer }: BoardListProps) {
  const router = useRouter();
  const [items, setItems] = useState<BoardListItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = canEdit(viewer.role);

  const onCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/boards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `failed (${res.status})`);
        return;
      }
      const created: Board = await res.json();
      setItems((prev) => [{ board: created, shareToken: null }, ...prev]);
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/boards/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  const openCreate = () => {
    setError(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  return (
    <>
      <AppHeader
        actions={
          <>
            <Button
              size="small"
              variant="text"
              color="inherit"
              component={Link}
              href="/share/demo"
              target="_blank"
              rel="noopener"
              endIcon={<OpenInNewIcon fontSize="inherit" />}
              sx={{ color: "text.secondary" }}
            >
              View example
            </Button>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                Boards
              </Typography>
              <Typography variant="body1" color="text.secondary">
                One board per product or per quarterly review. Most teams keep
                3–8.
              </Typography>
            </Box>
            {editable ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => openCreate()}
              >
                New board
              </Button>
            ) : null}
          </Stack>

          {items.length === 0 ? (
            <EmptyState canCreate={editable} />
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
              }}
            >
              {items.map((it) => (
                <BoardCard key={it.board.id} item={it} editable={editable} />
              ))}
            </Box>
          )}
        </Stack>
      </Container>

      <Dialog
        open={open}
        onClose={() => !creating && setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5 }}>New board</DialogTitle>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 3, pb: 2 }}
        >
          A board collects the screens you want to talk about with stakeholders.
          You can edit everything later.
        </Typography>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.5}>
            <TextField
              autoFocus
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Dashboard / Q2 2026"
              helperText={
                <>
                  This is the title stakeholders see at the top of the share
                  link. Common pattern:{" "}
                  <Box
                    component="span"
                    sx={{ fontFamily: "monospace", color: "text.primary" }}
                  >
                    Product / Quarter
                  </Box>
                  .
                </>
              }
            />
            <TextField
              label="Subtitle"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional · e.g. End-of-Q2 review for the leadership team."
              helperText="Appears beneath the name on the share link. Useful for context the title can't carry."
            />

            <Box
              sx={{
                p: 2,
                bgcolor: "background.default",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "text.secondary",
                  textTransform: "uppercase",
                }}
              >
                Next, in this board
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}
              >
                <NextStep n={1} label="Upload a screenshot" />
                <StepArrow />
                <NextStep n={2} label="Mark regions" />
                <StepArrow />
                <NextStep n={3} label="Share the link" />
              </Stack>
            </Box>

            {error ? (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            justifyContent: "space-between",
          }}
        >
          <Button
            size="small"
            component={Link}
            href="/share/demo"
            target="_blank"
            rel="noopener"
            endIcon={<OpenInNewIcon fontSize="inherit" />}
            sx={{ color: "text.secondary" }}
          >
            See the example first
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <Paper
      sx={{
        p: { xs: 4, sm: 6 },
        textAlign: "center",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {canCreate ? "Not sure where to start?" : "No boards yet"}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 460, mx: "auto" }}
      >
        {canCreate
          ? "Open the example board — two screens, twelve regions across all three states. It's the fastest way to feel what a finished board does."
          : "An editor in this workspace hasn't created any boards yet. Open the example to see what one looks like."}
      </Typography>
      <Button
        component={Link}
        href="/share/demo"
        target="_blank"
        rel="noopener"
        variant="outlined"
        color="primary"
        endIcon={<OpenInNewIcon fontSize="inherit" />}
      >
        Open the example
      </Button>
    </Paper>
  );
}

function NextStep({ n, label }: { n: number; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {n}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </Stack>
  );
}

function StepArrow() {
  return (
    <Box
      aria-hidden
      sx={{
        color: "text.secondary",
        opacity: 0.5,
        display: { xs: "none", sm: "inline" },
      }}
    >
      →
    </Box>
  );
}

function BoardCard({
  item,
  editable,
}: {
  item: BoardListItem;
  editable: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { board, shareToken } = item;

  const copyShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // Editors land on the editor; viewers go straight to the public share
  // view (read-only) so the editor's edit affordances aren't a tease.
  const href = editable
    ? `/boards/${board.id}`
    : shareToken
      ? `/share/${shareToken}`
      : `/boards/${board.id}`;

  return (
    <Paper
      component={Link}
      href={href}
      sx={{
        p: 2.5,
        textDecoration: "none",
        color: "inherit",
        display: "block",
        transition: "transform 120ms ease, border-color 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Typography variant="h6" sx={{ mb: 0.5, flex: 1 }}>
          {board.name}
        </Typography>
        {shareToken ? (
          <Tooltip title={copied ? "Copied!" : "Copy share link"}>
            <IconButton
              size="small"
              onClick={copyShare}
              aria-label="Copy share link"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      {board.description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {board.description}
        </Typography>
      ) : null}
      {shareToken ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: "monospace" }}
        >
          /share/{shareToken.slice(0, 8)}…
        </Typography>
      ) : (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          No active share link
        </Typography>
      )}
    </Paper>
  );
}
