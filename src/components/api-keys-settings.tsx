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
  WORKSPACE_ROLES,
  meetsRole,
  type ApiKey,
  type WorkspaceRole,
} from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

interface ApiKeysSettingsProps {
  viewer: CurrentMember;
  initialKeys: ApiKey[];
}

/**
 * Self-service API keys for agents and scripts.
 *
 * The plaintext key exists in the browser exactly once — in the reveal
 * panel right after creation. The list below only ever shows the stored
 * prefix, matching what the server kept.
 */
export function ApiKeysSettings({ viewer, initialKeys }: ApiKeysSettingsProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(
    viewer.role === "owner" ? "editor" : viewer.role,
  );
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
        body: JSON.stringify({ name: name.trim(), role }),
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
      setKeys((prev) =>
        prev.map((x) => (x.id === k.id ? { ...x, revokedAt: Date.now() } : x)),
      );
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
              screens, and share links.
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
              {keys.map((k) => (
                <Stack
                  key={k.id}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ p: 2, opacity: k.revokedAt !== null ? 0.5 : 1 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {k.name}
                      {k.revokedAt !== null ? " (revoked)" : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      <code>{k.keyPrefix}…</code> · created{" "}
                      {formatAuditTime(k.createdAt)}
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
              ))}
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
        </Stack>
      </Container>
    </>
  );
}
