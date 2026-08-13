"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Link from "next/link";
import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";
import { formatAuditTime } from "@/lib/audit";
import {
  API_KEY_EXPIRY_PRESETS,
  DEFAULT_API_KEY_EXPIRY_DAYS,
  WORKSPACE_ROLES,
  apiKeyExpiryStatus,
  meetsRole,
  type ApiKey,
  type WorkspaceApiKey,
  type WorkspaceRole,
} from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

interface ApiKeysSettingsProps {
  viewer: CurrentMember;
  initialKeys: ApiKey[];
  /** Every workspace key with owner identity; null unless the viewer is an owner. */
  initialWorkspaceKeys: WorkspaceApiKey[] | null;
  /** Server-side timestamp so SSR and hydration agree on expiry labels. */
  now: number;
}

const DAY_MS = 86_400_000;

function expiryLabel(
  expiresAt: number | null,
  now: number,
): { text: string; warn: boolean } {
  if (expiresAt === null) return { text: "no expiration", warn: false };
  const date = formatAuditTime(expiresAt).slice(0, 10);
  const status = apiKeyExpiryStatus(expiresAt, now);
  if (status === "expired") return { text: `expired ${date}`, warn: true };
  if (status === "expiring-soon") {
    const days = Math.max(1, Math.ceil((expiresAt - now) / DAY_MS));
    return {
      text: `expires in ${days} day${days === 1 ? "" : "s"}`,
      warn: true,
    };
  }
  return { text: `expires ${date}`, warn: false };
}

/**
 * Self-service API keys for agents and scripts.
 *
 * The plaintext key exists in the browser exactly once — in the reveal
 * panel right after creation. The list below only ever shows the stored
 * prefix, matching what the server kept. Owners additionally see every
 * key in the workspace, because a credential nobody can inventory is a
 * liability.
 */
export function ApiKeysSettings({
  viewer,
  initialKeys,
  initialWorkspaceKeys,
  now,
}: ApiKeysSettingsProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [workspaceKeys, setWorkspaceKeys] = useState<WorkspaceApiKey[] | null>(
    initialWorkspaceKeys,
  );
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(
    viewer.role === "owner" ? "editor" : viewer.role,
  );
  // "never" | number-of-days as string, for the Select.
  const [expiry, setExpiry] = useState(String(DEFAULT_API_KEY_EXPIRY_DAYS));
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; key: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // A key can't exceed its creator's role, so hide unreachable options.
  const roleOptions = WORKSPACE_ROLES.filter((r) => meetsRole(viewer.role, r));

  const onCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          expiresInDays: expiry === "never" ? null : Number(expiry),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        key?: string;
      } & Partial<ApiKey>;
      if (!res.ok || !body.key || !body.id) {
        setError(body.error ?? `failed (${res.status})`);
        return;
      }
      const { key, ...created } = body;
      setKeys((prev) => [created as ApiKey, ...prev]);
      setWorkspaceKeys((prev) =>
        prev
          ? [
              {
                ...(created as ApiKey),
                userName: viewer.user.name,
                userEmail: viewer.user.email,
              },
              ...prev,
            ]
          : prev,
      );
      setRevealed({ id: body.id, key });
      setCopied(false);
      setName("");
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (k: ApiKey) => {
    if (!confirm(`Revoke "${k.name}"? Anything using it stops working.`)) {
      return;
    }
    setError(null);
    setPendingId(k.id);
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `failed (${res.status})`);
        return;
      }
      const markRevoked = <T extends ApiKey>(list: T[]): T[] =>
        list.map((x) => (x.id === k.id ? { ...x, revokedAt: Date.now() } : x));
      setKeys(markRevoked);
      setWorkspaceKeys((prev) => (prev ? markRevoked(prev) : prev));
      if (revealed?.id === k.id) setRevealed(null);
    } finally {
      setPendingId(null);
    }
  };

  const onCopy = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed.key);
    setCopied(true);
  };

  const renderKeyRow = (k: ApiKey, ownerLine?: string) => {
    const expiryInfo = expiryLabel(k.expiresAt, now);
    const dead =
      k.revokedAt !== null ||
      apiKeyExpiryStatus(k.expiresAt, now) === "expired";
    return (
      <Stack
        key={k.id}
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ p: 2, opacity: dead ? 0.5 : 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {k.name}
            {k.revokedAt !== null ? " (revoked)" : ""}
            {ownerLine ? (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                {ownerLine}
              </Typography>
            ) : null}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            <code>{k.keyPrefix}…</code> · created{" "}
            {formatAuditTime(k.createdAt).slice(0, 10)} ·{" "}
            <Box
              component="span"
              sx={expiryInfo.warn ? { color: "warning.main" } : undefined}
            >
              {expiryInfo.text}
            </Box>
            {k.lastUsedAt !== null
              ? ` · last used ${formatAuditTime(k.lastUsedAt)}`
              : " · never used"}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            px: 0.75,
            py: 0.125,
            border: 1,
            borderColor: "divider",
            borderRadius: 0.5,
            color: "text.secondary",
            textTransform: "capitalize",
          }}
        >
          {k.role}
        </Typography>
        {k.revokedAt === null ? (
          <Tooltip title="Revoke key">
            <span>
              <IconButton
                size="small"
                onClick={() => onRevoke(k)}
                disabled={pendingId === k.id}
                aria-label="Revoke API key"
                sx={{ color: "text.secondary" }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>
    );
  };

  return (
    <>
      <AppHeader
        homeHref="/boards"
        crumb="API keys"
        actions={<UserMenu user={viewer.user} role={viewer.role} />}
      />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              API keys
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Let agents and scripts read and update boards without a browser
              sign-in — over the REST API or the MCP endpoint at{" "}
              <code>/api/mcp</code>. Keys act as you, capped at the role you
              give them. See <Link href="/docs/agents">the agent docs</Link> for
              wiring one up.
            </Typography>
          </Box>

          {error ? (
            <Paper
              sx={{ p: 2, borderColor: "error.main", color: "error.main" }}
            >
              <Typography variant="body2">{error}</Typography>
            </Paper>
          ) : null}

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              New key
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                placeholder="e.g. release-bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                helperText="Shown in this list and in the audit log."
                sx={{ flex: 1 }}
              />
              <Select
                size="small"
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                sx={{ minWidth: 120, textTransform: "capitalize" }}
              >
                {roleOptions.map((r) => (
                  <MenuItem
                    key={r}
                    value={r}
                    sx={{ textTransform: "capitalize" }}
                  >
                    {r}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                {API_KEY_EXPIRY_PRESETS.map((days) => (
                  <MenuItem key={days} value={String(days)}>
                    {days === 365 ? "1 year" : `${days} days`}
                  </MenuItem>
                ))}
                <MenuItem value="never">No expiration</MenuItem>
              </Select>
              <Button
                variant="contained"
                onClick={onCreate}
                disabled={creating || !name.trim()}
              >
                Create key
              </Button>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Viewer keys can read boards; editor keys can also change regions,
              screens, and share links. Expired keys stop working on their own.
            </Typography>
          </Paper>

          {revealed ? (
            <Paper sx={{ p: 2.5, borderColor: "primary.main" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Copy your key now — it won&apos;t be shown again
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  component="code"
                  sx={{
                    flex: 1,
                    p: 1,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    fontSize: 13,
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  {revealed.key}
                </Box>
                <Tooltip title={copied ? "Copied" : "Copy to clipboard"}>
                  <IconButton
                    size="small"
                    onClick={onCopy}
                    aria-label="Copy API key"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          ) : null}

          <Paper sx={{ overflow: "hidden" }}>
            <Stack
              divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
            >
              {keys.map((k) => renderKeyRow(k))}
              {keys.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    No keys yet. Create one above to let an agent read this
                    workspace.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Paper>

          {workspaceKeys ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                All workspace keys
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                Every key in this workspace, visible to owners only. You can
                revoke any of them; the audit log records who revoked what.
              </Typography>
              <Paper sx={{ overflow: "hidden" }}>
                <Stack
                  divider={
                    <Box sx={{ borderTop: 1, borderColor: "divider" }} />
                  }
                >
                  {workspaceKeys.map((k) =>
                    renderKeyRow(
                      k,
                      k.userId === viewer.user.id
                        ? "yours"
                        : (k.userName ?? k.userEmail ?? "former member"),
                    ),
                  )}
                  {workspaceKeys.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        No keys exist in this workspace yet.
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
              </Paper>
            </Box>
          ) : null}
        </Stack>
      </Container>
    </>
  );
}
