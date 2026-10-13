"use client";
import { useTranslations } from "next-intl";

import { useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  WORKSPACE_ROLES,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";
import { clientRequest } from "@/lib/client-request";
import { SettingsFrame } from "./settings-frame";

interface MemberRosterProps {
  viewer: CurrentMember;
  initialMembers: WorkspaceMember[];
}

/**
 * Owner-only roster.
 *
 * Two operations: change a member's role (Select), or remove their
 * membership (icon button). The server refuses to demote / remove the
 * last owner, so the UI doesn't need to special-case it — it just
 * surfaces the API error.
 */
export function MemberRoster({ viewer, initialMembers }: MemberRosterProps) {
  const t = useTranslations("Common");
  const changeRole = async (member: WorkspaceMember, role: WorkspaceRole) => {
    await clientRequest(`/api/workspace/members/${member.userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
  };

  const removeMember = async (member: WorkspaceMember) => {
    if (
      !confirm(
        t("confirmMemberRemove", {
          name: member.email ?? member.name ?? t("memberFallback"),
        }),
      )
    )
      return false;
    await clientRequest(`/api/workspace/members/${member.userId}`, {
      method: "DELETE",
    });
    return true;
  };

  return (
    <MemberRosterView
      viewer={viewer}
      initialMembers={initialMembers}
      onChangeRole={changeRole}
      onRemove={removeMember}
    />
  );
}

export function MemberRosterView({
  viewer,
  initialMembers,
  onChangeRole,
  onRemove,
}: MemberRosterProps & {
  onChangeRole: (member: WorkspaceMember, role: WorkspaceRole) => Promise<void>;
  onRemove: (member: WorkspaceMember) => Promise<boolean>;
}) {
  const t = useTranslations("Common");
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const mutationInFlight = useRef(false);

  const changeRole = async (m: WorkspaceMember, role: WorkspaceRole) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setError(null);
    setPendingId(m.userId);
    try {
      await onChangeRole(m, role);
      setMembers((prev) =>
        prev.map((x) => (x.userId === m.userId ? { ...x, role } : x)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("roleChangeFailed"));
    } finally {
      mutationInFlight.current = false;
      setPendingId(null);
    }
  };

  const removeMember = async (m: WorkspaceMember) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setError(null);
    setPendingId(m.userId);
    try {
      if (await onRemove(m))
        setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("memberRemoveFailed"),
      );
    } finally {
      mutationInFlight.current = false;
      setPendingId(null);
    }
  };

  return (
    <SettingsFrame
      viewer={viewer}
      section="members"
      title={t("members")}
      description={t("memberDescription")}
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

        <Paper sx={{ overflow: "hidden" }}>
          <Stack
            divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
          >
            {members.map((m) => (
              <Stack
                key={m.userId}
                direction="row"
                spacing={0}
                alignItems="center"
                sx={{ p: 2, gap: 1.5, flexWrap: "wrap" }}
              >
                <Avatar
                  src={m.image ?? undefined}
                  alt={m.name ?? m.email ?? ""}
                  sx={{ width: 36, height: 36 }}
                >
                  {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                </Avatar>
                <Box
                  sx={{ flex: 1, minWidth: { xs: "calc(100% - 60px)", sm: 0 } }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {m.name ?? m.email?.split("@")[0]}
                    {m.userId === viewer.user.id ? t("you") : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {m.email}
                  </Typography>
                </Box>
                <Select
                  size="small"
                  value={m.role}
                  onChange={(e) =>
                    void changeRole(m, e.target.value as WorkspaceRole)
                  }
                  disabled={pendingId !== null}
                  inputProps={{
                    "aria-label": t("roleFor", {
                      name: m.name ?? m.email ?? t("memberNameFallback"),
                    }),
                  }}
                  sx={{
                    minWidth: 120,
                    ml: { xs: "51px", sm: 0 },
                    textTransform: "capitalize",
                  }}
                >
                  {WORKSPACE_ROLES.map((r) => (
                    <MenuItem
                      key={r}
                      value={r}
                      sx={{ textTransform: "capitalize" }}
                    >
                      {t(`roles.${r}`)}
                    </MenuItem>
                  ))}
                </Select>
                <Tooltip title={t("removeMember")}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => void removeMember(m)}
                      disabled={pendingId !== null}
                      aria-label={t("removeNamed", {
                        name: m.name ?? m.email ?? t("memberNameFallback"),
                      })}
                      sx={{ color: "text.secondary" }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}
            {members.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {t("noMembers")}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Paper>

        <Box sx={{ px: { xs: 0, sm: 2 }, maxWidth: 760 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t("rolePermissions")}
          </Typography>
          <Stack spacing={0.5}>
            <RoleRow role="owner" desc={t("ownerDescription")} />
            <RoleRow role="editor" desc={t("editorDescription")} />
            <RoleRow role="viewer" desc={t("viewerDescription")} />
          </Stack>
        </Box>
      </Stack>
    </SettingsFrame>
  );
}

function RoleRow({ role, desc }: { role: WorkspaceRole; desc: string }) {
  const t = useTranslations("Common");
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Typography
        variant="caption"
        sx={{
          width: 100,
          fontWeight: 700,
          color: "text.primary",
          textTransform: "capitalize",
          flexShrink: 0,
          pt: 0.25,
        }}
      >
        {t(`roles.${role}`)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {desc}
      </Typography>
    </Stack>
  );
}
