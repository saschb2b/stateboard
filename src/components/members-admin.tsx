"use client";

import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";
import {
  WORKSPACE_ROLES,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

interface MembersAdminProps {
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
export function MembersAdmin({ viewer, initialMembers }: MembersAdminProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onChangeRole = async (m: WorkspaceMember, role: WorkspaceRole) => {
    setError(null);
    setPendingId(m.userId);
    const previous = members;
    setMembers((prev) =>
      prev.map((x) => (x.userId === m.userId ? { ...x, role } : x)),
    );
    try {
      const res = await fetch(`/api/workspace/members/${m.userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `failed (${res.status})`);
        setMembers(previous);
      }
    } finally {
      setPendingId(null);
    }
  };

  const onRemove = async (m: WorkspaceMember) => {
    if (!confirm(`Remove ${m.email ?? m.name ?? "this member"}?`)) return;
    setError(null);
    setPendingId(m.userId);
    try {
      const res = await fetch(`/api/workspace/members/${m.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `failed (${res.status})`);
        return;
      }
      setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <AppHeader
        crumb="Members"
        actions={<UserMenu user={viewer.user} role={viewer.role} />}
      />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              Members
            </Typography>
            <Typography variant="body1" color="text.secondary">
              People who have signed in via Keycloak. New sign-ins land here as{" "}
              <strong>editor</strong> by default; promote to owner if they
              should manage this list, or demote to viewer for read-only access.
            </Typography>
          </Box>

          {error ? (
            <Paper
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
                  spacing={2}
                  alignItems="center"
                  sx={{ p: 2 }}
                >
                  <Avatar
                    src={m.image ?? undefined}
                    alt={m.name ?? m.email ?? ""}
                    sx={{ width: 36, height: 36 }}
                  >
                    {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {m.name ?? m.email?.split("@")[0]}
                      {m.userId === viewer.user.id ? " (you)" : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {m.email}
                    </Typography>
                  </Box>
                  <Select
                    size="small"
                    value={m.role}
                    onChange={(e) =>
                      onChangeRole(m, e.target.value as WorkspaceRole)
                    }
                    disabled={pendingId === m.userId}
                    sx={{ minWidth: 120, textTransform: "capitalize" }}
                  >
                    {WORKSPACE_ROLES.map((r) => (
                      <MenuItem
                        key={r}
                        value={r}
                        sx={{ textTransform: "capitalize" }}
                      >
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                  <Tooltip title="Remove from workspace">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onRemove(m)}
                        disabled={pendingId === m.userId}
                        aria-label="Remove member"
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
                    No members yet.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Role permissions
            </Typography>
            <Stack spacing={0.5}>
              <RoleRow
                role="owner"
                desc="Manage members and the workspace itself, plus everything an editor can do."
              />
              <RoleRow
                role="editor"
                desc="Create, edit, and delete boards, screens, and regions. Mint and revoke share links."
              />
              <RoleRow
                role="viewer"
                desc="Read boards inside the app. Public share links work without any role."
              />
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}

function RoleRow({ role, desc }: { role: WorkspaceRole; desc: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Typography
        variant="caption"
        sx={{
          width: 64,
          fontWeight: 700,
          color: "primary.main",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          flexShrink: 0,
          pt: 0.25,
        }}
      >
        {role}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {desc}
      </Typography>
    </Stack>
  );
}
