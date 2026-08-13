"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { formatAuditTime } from "@/lib/audit";
import {
  apiKeyExpiryStatus,
  type ApiKey,
  type WorkspaceApiKey,
} from "@/lib/types";

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

interface ApiKeyListProps {
  keys: (ApiKey | WorkspaceApiKey)[];
  /** Request-stable timestamp so SSR and hydration agree on expiry labels. */
  now: number;
  viewerId: string;
  pendingId: string | null;
  onRevoke: (key: ApiKey) => void;
  /** Attribute each row to its owner — the owner-only inventory view. */
  showOwner?: boolean;
  emptyText: string;
}

/** The key rows: prefix, expiry (with warning window), last use, revoke. */
export function ApiKeyList({
  keys,
  now,
  viewerId,
  pendingId,
  onRevoke,
  showOwner = false,
  emptyText,
}: ApiKeyListProps) {
  const ownerLine = (k: ApiKey | WorkspaceApiKey): string | null => {
    if (!showOwner) return null;
    if (k.userId === viewerId) return "yours";
    if ("userName" in k) return k.userName ?? k.userEmail ?? "former member";
    return "former member";
  };

  return (
    <Paper sx={{ overflow: "hidden" }}>
      <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
        {keys.map((k) => {
          const expiry = expiryLabel(k.expiresAt, now);
          const dead =
            k.revokedAt !== null ||
            apiKeyExpiryStatus(k.expiresAt, now) === "expired";
          const owner = ownerLine(k);
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
                  {owner ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {owner}
                    </Typography>
                  ) : null}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  <code>{k.keyPrefix}…</code> · created{" "}
                  {formatAuditTime(k.createdAt).slice(0, 10)} ·{" "}
                  <Box
                    component="span"
                    sx={expiry.warn ? { color: "warning.main" } : undefined}
                  >
                    {expiry.text}
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
        })}
        {keys.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
