"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import { MONO_FONT } from "@/lib/theme";
import type { Board, ShareLink } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

type Section = "general" | "sharing";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "sharing", label: "Sharing" },
];

export interface BoardStats {
  screens: number;
  regions: number;
  shareLinks: number;
}

/** "2 screens, 6 regions, and 1 share link" — omits any zero, "" if all zero. */
function describeContents(stats: BoardStats): string {
  const parts: string[] = [];
  if (stats.screens)
    parts.push(`${stats.screens} screen${stats.screens === 1 ? "" : "s"}`);
  if (stats.regions)
    parts.push(`${stats.regions} region${stats.regions === 1 ? "" : "s"}`);
  if (stats.shareLinks)
    parts.push(
      `${stats.shareLinks} share link${stats.shareLinks === 1 ? "" : "s"}`,
    );
  if (parts.length <= 1) return parts.join("");
  const last = parts[parts.length - 1] ?? "";
  return `${parts.slice(0, -1).join(", ")}, and ${last}`;
}

interface BoardSettingsProps {
  board: Board;
  viewer: CurrentMember;
  initialShareLinks: ShareLink[];
  stats: BoardStats;
  initialSection?: Section;
}

/**
 * Per-board settings, reached from the editor's gear icon. A left rail
 * switches between sections; each renders its own pane. General edits the
 * basics and holds the Danger Zone; Sharing manages public links.
 */
export function BoardSettings({
  board,
  viewer,
  initialShareLinks,
  stats,
  initialSection = "general",
}: BoardSettingsProps) {
  const [section, setSection] = useState<Section>(initialSection);

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
            <Stack sx={{ mt: 0.5 }} spacing={0.25}>
              {SECTIONS.map((s) => {
                const active = s.id === section;
                return (
                  <Box
                    key={s.id}
                    component="button"
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSection(s.id)}
                    sx={{
                      textAlign: "left",
                      border: 0,
                      cursor: "pointer",
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      fontSize: 14,
                      fontWeight: 600,
                      color: active ? "text.primary" : "text.secondary",
                      bgcolor: active ? "action.selected" : "transparent",
                      "&:hover": {
                        bgcolor: active ? "action.selected" : "action.hover",
                        color: "text.primary",
                      },
                    }}
                  >
                    {s.label}
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, maxWidth: 720 }}>
            {section === "general" ? (
              <GeneralSection board={board} stats={stats} />
            ) : (
              <SharingSection
                board={board}
                initialShareLinks={initialShareLinks}
              />
            )}
          </Box>
        </Box>
      </Container>
    </>
  );
}

function GeneralSection({ board, stats }: { board: Board; stats: BoardStats }) {
  const router = useRouter();
  const contents = describeContents(stats);
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
            <Typography sx={{ fontWeight: 600 }}>Delete this board</Typography>
            <Typography variant="body2" color="text.secondary">
              Once deleted, there is no going back. This permanently removes the
              board{contents ? ` and its ${contents}` : ""}.
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

      {deleteOpen ? (
        <DeleteBoardDialog
          board={board}
          stats={stats}
          onClose={() => setDeleteOpen(false)}
        />
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

function SharingSection({
  board,
  initialShareLinks,
}: {
  board: Board;
  initialShareLinks: ShareLink[];
}) {
  const [links, setLinks] = useState<ShareLink[]>(initialShareLinks);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const active = links.filter((l) => l.revokedAt === null);
  const revoked = links.filter((l) => l.revokedAt !== null);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${board.id}/share-links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't create the link.");
        return;
      }
      const link: ShareLink = await res.json();
      setLinks((prev) => [link, ...prev]);
      setLabel("");
    } catch {
      setError("Couldn't create the link.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (token: string) => {
    if (
      !confirm(
        "Revoke this link? Anyone using it will lose access immediately.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/share-links/${token}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't revoke the link.");
        return;
      }
      const revokedAt = Date.now();
      setLinks((prev) =>
        prev.map((l) => (l.token === token ? { ...l, revokedAt } : l)),
      );
    } catch {
      setError("Couldn't revoke the link.");
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/share/${token}`,
      );
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(null), 1500);
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  };

  return (
    <>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Sharing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Public links anyone can open without signing in. Make one per audience
        and revoke any of them without affecting the others.
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ mb: 3 }}
        alignItems={{ sm: "flex-start" }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Label (optional), e.g. Exec review"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !creating) create();
          }}
        />
        <Button
          variant="contained"
          onClick={create}
          disabled={creating}
          sx={{ flexShrink: 0 }}
        >
          {creating ? "Creating…" : "Create link"}
        </Button>
      </Stack>

      {active.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No active share links. Create one to share this board.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {active.map((link) => (
            <Box
              key={link.token}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {link.label || "Untitled link"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: MONO_FONT }}
                  noWrap
                >
                  /share/{link.token}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => copy(link.token)}
                  sx={{ borderColor: "divider" }}
                >
                  {copiedToken === link.token ? "Copied" : "Copy"}
                </Button>
                <Tooltip title="Open share view">
                  <IconButton
                    size="small"
                    component="a"
                    href={`/share/${link.token}`}
                    target="_blank"
                    rel="noopener"
                    aria-label="Open share view in a new tab"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  color="error"
                  onClick={() => revoke(link.token)}
                >
                  Revoke
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {revoked.length > 0 ? (
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", fontWeight: 700 }}
          >
            Revoked
          </Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {revoked.map((link) => (
              <Box
                key={link.token}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  opacity: 0.6,
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {link.label || "Untitled link"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: MONO_FONT }}
                    noWrap
                  >
                    /share/{link.token}
                  </Typography>
                </Box>
                <Chip size="small" label="Revoked" />
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

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
  stats,
  onClose,
}: {
  board: Board;
  stats: BoardStats;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirm.trim() === board.name;
  const contents = describeContents(stats);

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
          This permanently deletes <b>{board.name}</b>
          {contents ? ` and its ${contents}` : ""}. This cannot be undone.
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
