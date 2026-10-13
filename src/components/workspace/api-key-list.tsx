"use client";
import { useFormatter, useTranslations } from "next-intl";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyIcon from "@mui/icons-material/Key";
import {
  apiKeyExpiryStatus,
  type ApiKey,
  type WorkspaceApiKey,
} from "@/lib/types";

const DAY_MS = 86_400_000;

type KeyStatus =
  | { kind: "active"; expiryText: string }
  | { kind: "expiring"; chip: string }
  | { kind: "expired"; chip: string }
  | { kind: "revoked"; chip: string };

function keyStatus(
  k: ApiKey,
  now: number,
  t: ReturnType<typeof useTranslations<"Common">>,
  fmtDate: (ms: number) => string,
): KeyStatus {
  if (k.revokedAt !== null) return { kind: "revoked", chip: t("revoked") };
  const status = apiKeyExpiryStatus(k.expiresAt, now);
  if (status === "expired") {
    return {
      kind: "expired",
      chip: t("expiredDate", { date: fmtDate(k.expiresAt!) }),
    };
  }
  if (status === "expiring-soon") {
    const days = Math.max(1, Math.ceil((k.expiresAt! - now) / DAY_MS));
    return {
      kind: "expiring",
      chip: t("expiresDays", { count: days }),
    };
  }
  return {
    kind: "active",
    expiryText:
      k.expiresAt === null
        ? t("noExpiryLower")
        : t("expiresDate", { date: fmtDate(k.expiresAt) }),
  };
}

interface ApiKeyListProps {
  keys: (ApiKey | WorkspaceApiKey)[];
  /** Request-stable timestamp so SSR and hydration agree on labels. */
  now: number;
  viewerId: string;
  pendingId: string | null;
  onRevoke: (key: ApiKey) => void;
  /** Attribute each row to its owner — the owner-only inventory view. */
  showOwner?: boolean;
  emptyText: string;
}

/**
 * The key rows, GitHub-token style: a leading key tile, the name with
 * role + status chips, and one quiet metadata line in human dates.
 */
export function ApiKeyList({
  keys,
  now,
  viewerId,
  pendingId,
  onRevoke,
  showOwner = false,
  emptyText,
}: ApiKeyListProps) {
  const t = useTranslations("Common");
  const format = useFormatter();
  const fmtDate = (ms: number) =>
    format.dateTime(ms, { year: "numeric", month: "short", day: "numeric" });
  const ownerLine = (k: ApiKey | WorkspaceApiKey): string | null => {
    if (!showOwner) return null;
    if (k.userId === viewerId) return t("yours");
    if ("userName" in k) return k.userName ?? k.userEmail ?? t("formerMember");
    return t("formerMember");
  };

  return (
    <Paper sx={{ overflow: "hidden" }}>
      <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
        {keys.map((k) => {
          const status = keyStatus(k, now, t, fmtDate);
          const dead = status.kind === "expired" || status.kind === "revoked";
          const owner = ownerLine(k);
          return (
            <Stack
              key={k.id}
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                px: 2.5,
                py: 2,
                color: dead ? "text.secondary" : "text.primary",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  bgcolor: (t) =>
                    status.kind === "expiring"
                      ? alpha(t.palette.warning.main, 0.14)
                      : t.palette.action.hover,
                  color:
                    status.kind === "expiring"
                      ? "warning.main"
                      : "text.secondary",
                }}
              >
                <KeyIcon fontSize="small" />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ minWidth: 0, mb: 0.5, flexWrap: "wrap", rowGap: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {k.name}
                  </Typography>
                  <RoleChip role={k.role} />
                  {status.kind !== "active" ? (
                    <StatusChip
                      label={status.chip}
                      warn={status.kind === "expiring"}
                    />
                  ) : null}
                  {owner ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ flexShrink: 0 }}
                    >
                      {owner}
                    </Typography>
                  ) : null}
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 0.5 }}
                >
                  <Box
                    component="code"
                    sx={{
                      px: 0.75,
                      py: 0.125,
                      flexShrink: 0,
                      bgcolor: "action.hover",
                      borderRadius: 0.5,
                      fontSize: 12,
                      color: "text.secondary",
                    }}
                  >
                    {k.keyPrefix}…
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("createdDate", { date: fmtDate(k.createdAt) })}
                    {status.kind === "active"
                      ? ` · ${status.expiryText}`
                      : ""}{" "}
                    ·{" "}
                    {k.lastUsedAt !== null
                      ? t("lastUsed", {
                          time: format.relativeTime(k.lastUsedAt, now),
                        })
                      : t("neverUsed")}
                  </Typography>
                </Stack>
              </Box>

              {k.revokedAt === null ? (
                <Tooltip title={t("revokeKey")}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onRevoke(k)}
                      disabled={pendingId !== null}
                      aria-label={t("revokeNamed", { name: k.name })}
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
          <Stack spacing={1} alignItems="center" sx={{ py: 5, px: 3 }}>
            <KeyIcon sx={{ color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" align="center">
              {emptyText}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function RoleChip({ role }: { role: ApiKey["role"] }) {
  const t = useTranslations("Common");
  return (
    <Typography
      variant="caption"
      sx={{
        px: 0.75,
        py: 0.125,
        flexShrink: 0,
        border: 1,
        borderColor: "divider",
        borderRadius: 0.5,
        color: "text.secondary",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "capitalize",
        lineHeight: 1.6,
      }}
    >
      {t(`roles.${role}`)}
    </Typography>
  );
}

function StatusChip({ label, warn }: { label: string; warn: boolean }) {
  return (
    <Typography
      variant="caption"
      sx={{
        px: 0.75,
        py: 0.125,
        flexShrink: 0,
        borderRadius: 0.5,
        fontWeight: 600,
        lineHeight: 1.6,
        bgcolor: (t) =>
          warn
            ? alpha(t.palette.warning.main, 0.16)
            : t.palette.action.selected,
        color: warn ? "warning.main" : "text.secondary",
      }}
    >
      {label}
    </Typography>
  );
}
