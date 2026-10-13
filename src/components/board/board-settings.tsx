"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useRef, useState } from "react";
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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import { MONO_FONT } from "@/lib/theme";
import { TEXT_LIMITS, type Board, type ShareLink } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

type Section = "general" | "sharing";
const SECTIONS = [
  { id: "general", label: "general" },
  { id: "sharing", label: "visualSharing" },
] as const;

export interface BoardStats {
  screens: number;
  regions: number;
  shareLinks: number;
}

function useContentsDescription(stats: BoardStats): string {
  const t = useTranslations("Visual");
  const format = useFormatter();
  const parts: string[] = [];
  if (stats.screens) parts.push(t("screenCount", { count: stats.screens }));
  if (stats.regions) parts.push(t("regionCount", { count: stats.regions }));
  if (stats.shareLinks)
    parts.push(t("shareLinkCount", { count: stats.shareLinks }));
  return format.list(parts, { type: "conjunction" });
}

interface BoardSettingsProps {
  board: Board;
  viewer: CurrentMember;
  initialShareLinks: ShareLink[];
  stats: BoardStats;
  initialSection?: Section;
  onSaveDetails?: (
    details: Pick<Board, "name" | "description">,
  ) => Promise<Board>;
}

export function BoardSettings({
  board,
  viewer,
  initialShareLinks,
  stats,
  initialSection = "general",
  onSaveDetails,
}: BoardSettingsProps) {
  const t = useTranslations("Visual");
  const common = useTranslations("Common");
  const [section, setSection] = useState<Section>(initialSection);

  return (
    <>
      <AppHeader
        homeHref="/boards"
        breadcrumbs={[
          { label: common("boards"), href: "/boards" },
          { label: board.name, href: `/boards/${board.id}/releases` },
          { label: t("boardSettings") },
        ]}
        actions={
          <>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          {t("boardSettings")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: { xs: 3, sm: 4 },
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box
            component="nav"
            aria-label={t("settingsSections")}
            sx={{ width: { sm: 184 }, flexShrink: 0 }}
          >
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", px: 1.5, fontWeight: 700 }}
            >
              {t("settings")}
            </Typography>
            <Stack
              direction={{ xs: "row", sm: "column" }}
              sx={{ mt: 0.5 }}
              spacing={0.25}
            >
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
                      fontFamily: "inherit",
                      fontWeight: 600,
                      color: active ? "text.primary" : "text.secondary",
                      bgcolor: active ? "action.selected" : "transparent",
                      "&:hover": {
                        bgcolor: active ? "action.selected" : "action.hover",
                        color: "text.primary",
                      },
                    }}
                  >
                    {t(s.label)}
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
            <Box hidden={section !== "general"}>
              <GeneralSection
                board={board}
                stats={stats}
                onSaveDetails={onSaveDetails}
              />
            </Box>
            <Box hidden={section !== "sharing"}>
              <SharingSection
                board={board}
                initialShareLinks={initialShareLinks}
              />
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
}

function GeneralSection({
  board,
  stats,
  onSaveDetails,
}: Pick<BoardSettingsProps, "board" | "stats" | "onSaveDetails">) {
  const t = useTranslations("Visual");
  const router = useRouter();
  const contents = useContentsDescription(stats);
  const nameInput = useRef<HTMLInputElement>(null);
  const saveInFlight = useRef(false);
  const [savedDetails, setSavedDetails] = useState({
    name: board.name,
    description: board.description ?? "",
  });
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const trimmedDesc = description.trim();
  const dirty =
    name.trim() !== savedDetails.name ||
    trimmedDesc !== savedDetails.description;

  const discard = () => {
    setName(savedDetails.name);
    setDescription(savedDetails.description);
    setSaved(false);
    setError(null);
    setNameInvalid(false);
  };

  const save = async () => {
    if (!dirty || saveInFlight.current) return;
    if (!name.trim()) {
      setNameInvalid(true);
      nameInput.current?.focus();
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setSaved(false);
    setError(null);
    const details = { name: name.trim(), description: trimmedDesc || null };
    try {
      let updated: Board;
      if (onSaveDetails) {
        updated = await onSaveDetails(details);
      } else {
        const res = await fetch(`/api/boards/${board.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(details),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? t("saveChangesError"));
        }
        updated = await res.json();
      }
      setName(updated.name);
      setDescription(updated.description ?? "");
      setSavedDetails({
        name: updated.name,
        description: updated.description ?? "",
      });
      setSaved(true);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("saveChangesError"));
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Typography component="h2" variant="h6" sx={{ mb: 0.75 }}>
        {t("boardDetails")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t("boardDetailsDescription")}
      </Typography>

      <Stack
        component="form"
        noValidate
        spacing={2.5}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <TextField
          label={t("boardName")}
          value={name}
          disabled={saving}
          inputRef={nameInput}
          required
          error={nameInvalid}
          helperText={nameInvalid ? t("boardNameEmpty") : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
            if (e.target.value.trim()) setNameInvalid(false);
          }}
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: TEXT_LIMITS.name } }}
        />
        <TextField
          label={t("description")}
          value={description}
          disabled={saving}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaved(false);
          }}
          fullWidth
          size="small"
          multiline
          minRows={2}
          helperText={t("descriptionHelp")}
          slotProps={{ htmlInput: { maxLength: TEXT_LIMITS.description } }}
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Button type="submit" variant="contained" disabled={!dirty || saving}>
            {saving ? t("saving") : t("saveChanges")}
          </Button>
          {dirty ? (
            <Button color="inherit" onClick={discard} disabled={saving}>
              {t("discardChanges")}
            </Button>
          ) : null}
          <Typography
            role="status"
            variant="body2"
            color={saved ? "success.main" : "text.secondary"}
          >
            {saved ? t("changesSaved") : dirty ? t("unsavedChanges") : ""}
          </Typography>
        </Stack>
      </Stack>

      <Typography variant="h6" component="h2" sx={{ mt: 5, mb: 1.5 }}>
        {t("deleteBoard")}
      </Typography>
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
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
              {t("deleteThisBoard")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contents
                ? t("deleteBoardWithContents", { contents })
                : t("deleteBoardWithoutContents")}
            </Typography>
          </Box>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setDeleteOpen(true)}
            disabled={saving}
            sx={{ flexShrink: 0 }}
          >
            {t("deleteThisBoard")}
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
  const t = useTranslations("Visual");
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
        setError(body.error ?? t("createLinkError"));
        return;
      }
      const link: ShareLink = await res.json();
      setLinks((prev) => [link, ...prev]);
      setLabel("");
    } catch {
      setError(t("createLinkError"));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (token: string) => {
    if (!confirm(t("revokeLinkConfirm"))) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/share-links/${token}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? t("revokeLinkError"));
        return;
      }
      const revokedAt = Date.now();
      setLinks((prev) =>
        prev.map((l) => (l.token === token ? { ...l, revokedAt } : l)),
      );
    } catch {
      setError(t("revokeLinkError"));
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
      setError(t("clipboardError"));
    }
  };

  return (
    <>
      <Typography component="h2" variant="h6" sx={{ mb: 0.75 }}>
        {t("visualShareLinks")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t("visualShareDescription")}
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
          label={t("linkNameOptional")}
          placeholder={t("designReview")}
          disabled={creating}
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
          {creating ? t("creating") : t("createLink")}
        </Button>
      </Stack>

      {active.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t("noActiveLinks")}
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
                  {link.label || t("untitledLink")}
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
                  {copiedToken === link.token ? t("copied") : t("copy")}
                </Button>
                <Tooltip title={t("openShareView")}>
                  <IconButton
                    size="small"
                    component="a"
                    href={`/share/${link.token}`}
                    target="_blank"
                    rel="noopener"
                    aria-label={t("openShareViewNewTab")}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  color="error"
                  onClick={() => revoke(link.token)}
                >
                  {t("revoke")}
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
            {t("revoked")}
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
                    {link.label || t("untitledLink")}
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
                <Chip size="small" label={t("revoked")} />
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
  const t = useTranslations("Visual");
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirm.trim() === board.name;
  const contents = useContentsDescription(stats);

  const deleteInFlight = useRef(false);
  const onDelete = async () => {
    if (!matches || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? t("deleteBoardError"));
        setDeleting(false);
        deleteInFlight.current = false;
        return;
      }
      router.push("/boards");
      router.refresh();
    } catch {
      setError(t("deleteBoardError"));
      setDeleting(false);
      deleteInFlight.current = false;
    }
  };

  return (
    <Dialog
      open
      onClose={deleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t("deleteBoardQuestion")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t.rich(
            contents ? "deleteConfirmationWithContents" : "deleteConfirmation",
            { name: board.name, contents, strong: (chunks) => <b>{chunks}</b> },
          )}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t.rich("typeToConfirm", {
            name: board.name,
            strong: (chunks) => <b>{chunks}</b>,
          })}
        </Typography>
        <TextField
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          fullWidth
          size="small"
          autoFocus
          label={t("confirmBoardName")}
          disabled={deleting}
          placeholder={board.name}
          error={confirm.length > 0 && !matches}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches && !deleting) onDelete();
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
          {t("cancel")}
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={!matches || deleting}
          onClick={onDelete}
        >
          {deleting ? t("deleting") : t("deleteThisBoard")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
