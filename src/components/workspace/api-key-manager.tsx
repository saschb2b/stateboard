"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import {
  ApiKeyCreateForm,
  type ApiKeyCreateInput,
} from "./api-key-create-form";
import { ApiKeyList } from "./api-key-list";
import { ApiKeyReveal } from "./api-key-reveal";
import type { ApiKey, WorkspaceApiKey } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

interface ApiKeyManagerProps {
  viewer: CurrentMember;
  initialKeys: ApiKey[];
  /** Every workspace key with owner identity; null unless the viewer is an owner. */
  initialWorkspaceKeys: WorkspaceApiKey[] | null;
  /** Server-side timestamp so SSR and hydration agree on expiry labels. */
  now: number;
}

/**
 * The /settings/api-keys surface: owns the network calls and key state,
 * composed from ApiKeyCreateForm, ApiKeyReveal (the show-once secret
 * panel), and ApiKeyList (own keys, plus the owner-only workspace
 * inventory — a credential nobody can inventory is a liability).
 */
export function ApiKeyManager({
  viewer,
  initialKeys,
  initialWorkspaceKeys,
  now,
}: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [workspaceKeys, setWorkspaceKeys] = useState<WorkspaceApiKey[] | null>(
    initialWorkspaceKeys,
  );
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; key: string } | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onCreate = async (input: ApiKeyCreateInput): Promise<boolean> => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        key?: string;
      } & Partial<ApiKey>;
      if (!res.ok || !body.key || !body.id) {
        setError(body.error ?? `failed (${res.status})`);
        return false;
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
      return true;
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

          <ApiKeyCreateForm
            viewerRole={viewer.role}
            creating={creating}
            onCreate={onCreate}
          />

          {revealed ? (
            <ApiKeyReveal key={revealed.id} secret={revealed.key} />
          ) : null}

          <ApiKeyList
            keys={keys}
            now={now}
            viewerId={viewer.user.id}
            pendingId={pendingId}
            onRevoke={onRevoke}
            emptyText="No keys yet. Create one above to let an agent read this workspace."
          />

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
              <ApiKeyList
                keys={workspaceKeys}
                now={now}
                viewerId={viewer.user.id}
                pendingId={pendingId}
                onRevoke={onRevoke}
                showOwner
                emptyText="No keys exist in this workspace yet."
              />
            </Box>
          ) : null}
        </Stack>
      </Container>
    </>
  );
}
