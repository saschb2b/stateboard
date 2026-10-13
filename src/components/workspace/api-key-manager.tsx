"use client";
import { useTranslations } from "next-intl";

import { useRef, useState } from "react";
import { clientRequest } from "@/lib/client-request";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import Button from "@mui/material/Button";
import { SettingsFrame } from "./settings-frame";
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
type CreatedKey = ApiKey & { key: string };

export function ApiKeyManager(props: ApiKeyManagerProps) {
  const t = useTranslations("Common");
  return (
    <ApiKeyManagerView
      {...props}
      createKey={async (input) => {
        const result = await clientRequest<CreatedKey>("/api/api-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!result.key || !result.id) throw new Error(t("incompleteKey"));
        return result;
      }}
      revokeKey={async (key) => {
        if (!confirm(t("confirmRevoke", { name: key.name }))) return false;
        await clientRequest(`/api/api-keys/${key.id}`, { method: "DELETE" });
        return true;
      }}
    />
  );
}

export function ApiKeyManagerView({
  viewer,
  initialKeys,
  initialWorkspaceKeys,
  now,
  createKey,
  revokeKey,
}: ApiKeyManagerProps & {
  createKey: (input: ApiKeyCreateInput) => Promise<CreatedKey>;
  revokeKey: (key: ApiKey) => Promise<boolean>;
}) {
  const t = useTranslations("Common");
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

  const createInFlight = useRef(false);
  const revokeInFlight = useRef(false);

  const onCreate = async (input: ApiKeyCreateInput): Promise<boolean> => {
    if (createInFlight.current) return false;
    createInFlight.current = true;
    setError(null);
    setCreating(true);
    try {
      const body = await createKey(input);
      const { key, ...created } = body;
      setKeys((prev) => [created, ...prev]);
      setWorkspaceKeys((prev) =>
        prev
          ? [
              {
                ...created,
                userName: viewer.user.name,
                userEmail: viewer.user.email,
              },
              ...prev,
            ]
          : prev,
      );
      setRevealed({ id: body.id, key });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("keyCreateFailed"));
      return false;
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  };

  const onRevoke = async (k: ApiKey) => {
    if (revokeInFlight.current) return;
    revokeInFlight.current = true;
    setError(null);
    setPendingId(k.id);
    try {
      if (!(await revokeKey(k))) return;
      const markRevoked = <T extends ApiKey>(list: T[]): T[] =>
        list.map((x) => (x.id === k.id ? { ...x, revokedAt: Date.now() } : x));
      setKeys(markRevoked);
      setWorkspaceKeys((prev) => (prev ? markRevoked(prev) : prev));
      setRevealed((current) => (current?.id === k.id ? null : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("keyRevokeFailed"));
    } finally {
      revokeInFlight.current = false;
      setPendingId(null);
    }
  };

  return (
    <SettingsFrame
      viewer={viewer}
      section="api-keys"
      title={t("apiKeys")}
      description={t("keyDescription")}
      actions={
        <Button
          component={Link}
          href="/docs/agents"
          color="inherit"
          variant="outlined"
          sx={{ flexShrink: 0 }}
        >
          {t("agentSetup")}
        </Button>
      }
    >
      <Stack spacing={3}>
        {error ? (
          <Paper
            role="alert"
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

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            {t("yourKeys")}
          </Typography>
          <ApiKeyList
            keys={keys}
            now={now}
            viewerId={viewer.user.id}
            pendingId={pendingId}
            onRevoke={onRevoke}
            emptyText={t("noKeys")}
          />
        </Box>

        {workspaceKeys ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
              {t("otherKeys")}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.5 }}
            >
              {t("keyOwnerHelp")}
            </Typography>
            <ApiKeyList
              keys={workspaceKeys.filter(
                (key) => key.userId !== viewer.user.id,
              )}
              now={now}
              viewerId={viewer.user.id}
              pendingId={pendingId}
              onRevoke={onRevoke}
              showOwner
              emptyText={t("noOtherKeys")}
            />
          </Box>
        ) : null}
      </Stack>
    </SettingsFrame>
  );
}
