"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";
import type { Board } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

const SECTIONS = [{ id: "general", label: "General" }] as const;

interface BoardSettingsProps {
  board: Board;
  viewer: CurrentMember;
}

/**
 * Per-board settings, reached from the editor's gear icon. A left rail lists
 * sections (just General for now); the pane holds the editable basics and,
 * at the bottom, a GitHub-style Danger Zone for destructive actions.
 */
export function BoardSettings({ board, viewer }: BoardSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const trimmedDesc = description.trim();
  const dirty =
    name.trim() !== board.name || trimmedDesc !== (board.description ?? "");

  const save = async () => {
    if (!name.trim()) {
      setError("Board name can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: trimmedDesc || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't save changes.");
        return;
      }
      const updated: Board = await res.json();
      setName(updated.name);
      setDescription(updated.description ?? "");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppHeader
        homeHref="/boards"
        crumb={board.name}
        actions={
          <>
            <Button
              component={Link}
              href={`/boards/${board.id}`}
              size="small"
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              color="inherit"
              sx={{ borderColor: "divider" }}
            >
              Back to board
            </Button>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            gap: { xs: 2, sm: 5 },
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box
            component="nav"
            aria-label="Settings sections"
            sx={{ width: { sm: 200 }, flexShrink: 0 }}
          >
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", px: 1.5, fontWeight: 700 }}
            >
              Settings
            </Typography>
            <Stack sx={{ mt: 0.5 }}>
              {SECTIONS.map((s) => (
                <Box
                  key={s.id}
                  aria-current="page"
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    bgcolor: "action.selected",
                  }}
                >
                  {s.label}
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, maxWidth: 720 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              General
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The board name and description, and how to delete it.
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Board name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g. Acme Dashboard / Q2 2026"
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={2}
                helperText="Appears beneath the name on the share link."
              />
              <Box>
                <Button
                  variant="contained"
                  onClick={save}
                  disabled={!dirty || saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </Box>
            </Stack>

            <Typography
              variant="h6"
              sx={{ mt: 6, mb: 1.5, fontWeight: 700, color: "error.main" }}
            >
              Danger zone
            </Typography>
            <Box sx={{ border: 1, borderColor: "error.main", borderRadius: 1 }}>
              <Box
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    Delete this board
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Once deleted, there is no going back. This permanently
                    removes the board, its screens, regions, and share links.
                  </Typography>
                </Box>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => setDeleteOpen(true)}
                  sx={{ flexShrink: 0 }}
                >
                  Delete this board
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      {deleteOpen ? (
        <DeleteBoardDialog board={board} onClose={() => setDeleteOpen(false)} />
      ) : null}

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSaved(false)}
          sx={{ width: "100%" }}
        >
          Changes saved.
        </Alert>
      </Snackbar>
      <Snackbar
        open={error !== null}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setError(null)}
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

/**
 * Type-to-confirm delete, modeled on GitHub's: the destructive button stays
 * disabled until the typed name matches the board's exactly.
 */
function DeleteBoardDialog({
  board,
  onClose,
}: {
  board: Board;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirm.trim() === board.name;

  const onDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't delete the board.");
        setDeleting(false);
        return;
      }
      router.push("/boards");
      router.refresh();
    } catch {
      setError("Couldn't delete the board.");
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={deleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Delete this board?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This permanently deletes <b>{board.name}</b>, including its screens,
          regions, and share links. This cannot be undone.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Type <b>{board.name}</b> to confirm.
        </Typography>
        <TextField
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          fullWidth
          size="small"
          autoFocus
          placeholder={board.name}
          error={confirm.length > 0 && !matches}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches) onDelete();
          }}
        />
        {error ? (
          <Typography
            variant="caption"
            color="error"
            sx={{ mt: 1.5, display: "block" }}
          >
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={!matches || deleting}
          onClick={onDelete}
        >
          {deleting ? "Deleting…" : "Delete this board"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
