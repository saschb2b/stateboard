"use client";

import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LogoutIcon from "@mui/icons-material/Logout";
import GroupIcon from "@mui/icons-material/Group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { WorkspaceRole } from "@/lib/types";

interface UserMenuProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  role: WorkspaceRole;
}

/**
 * Avatar + dropdown in the top-right.
 *
 * Owners see a "Members" entry. Sign-out is always last and routes to
 * /sign-in via Better Auth's redirect. We deliberately don't show the
 * raw user id or workspace id — that's debugging info, not user-facing.
 */
export function UserMenu({ user, role }: UserMenuProps) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const initial = (user.name ?? user.email).slice(0, 1).toUpperCase();

  const onSignOut = async () => {
    await authClient.signOut();
    setAnchor(null);
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Open user menu"
        sx={{ p: 0.25 }}
      >
        <Avatar
          src={user.image ?? undefined}
          alt={user.name ?? user.email}
          sx={{
            width: 32,
            height: 32,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {initial}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {user.name ?? user.email.split("@")[0]}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.25 }}
          >
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
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
              {role}
            </Typography>
          </Stack>
        </Box>
        <Divider />
        {role === "owner" ? (
          <MenuItem
            component={Link}
            href="/settings/members"
            onClick={() => setAnchor(null)}
          >
            <GroupIcon fontSize="small" sx={{ mr: 1.5 }} />
            Members
          </MenuItem>
        ) : null}
        <MenuItem onClick={onSignOut}>
          <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
