"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Container,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import type { CurrentMember } from "@/lib/auth";
import { designTokens } from "@/lib/design-tokens";

export type SettingsSection = "members" | "api-keys" | "audit";

const sections = [
  { id: "members", label: "Members", icon: PeopleOutlineIcon, ownerOnly: true },
  {
    id: "api-keys",
    label: "API keys",
    icon: KeyOutlinedIcon,
    ownerOnly: false,
  },
  {
    id: "audit",
    label: "Audit log",
    icon: HistoryOutlinedIcon,
    ownerOnly: true,
  },
] as const;

export function SettingsFrame({
  viewer,
  section,
  title,
  description,
  actions,
  children,
}: {
  viewer?: CurrentMember;
  section: SettingsSection;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader
        homeHref="/boards"
        crumb="Workspace settings"
        actions={
          viewer ? (
            <UserMenu user={viewer.user} role={viewer.role} />
          ) : undefined
        }
      />
      <Container
        maxWidth={false}
        sx={{ maxWidth: designTokens.layout.content, py: { xs: 3, md: 4 } }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: `${designTokens.layout.navigation} minmax(0, 1fr)`,
            },
            gap: { xs: 3, md: 4 },
          }}
        >
          <Box
            component="nav"
            aria-label="Workspace settings"
            sx={{ minWidth: 0 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1.5, display: { xs: "none", md: "block" }, mb: 1 }}
            >
              Workspace
            </Typography>
            <Stack
              direction={{ xs: "row", md: "column" }}
              spacing={0.5}
              sx={{ overflowX: "auto" }}
            >
              {viewer ? (
                sections
                  .filter((item) => !item.ownerOnly || viewer.role === "owner")
                  .map((item) => (
                    <Button
                      key={item.id}
                      component={Link}
                      href={`/settings/${item.id}`}
                      color="inherit"
                      startIcon={<item.icon />}
                      aria-current={section === item.id ? "page" : undefined}
                      sx={{
                        justifyContent: "flex-start",
                        px: 1.5,
                        minHeight: 40,
                        flexShrink: 0,
                        color:
                          section === item.id
                            ? "text.primary"
                            : "text.secondary",
                        bgcolor:
                          section === item.id ? "action.selected" : undefined,
                      }}
                    >
                      {item.label}
                    </Button>
                  ))
              ) : (
                <Skeleton variant="rounded" width="100%" height={40} />
              )}
            </Stack>
          </Box>
          <Box component="main" sx={{ minWidth: 0 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "flex-start" }}
              sx={{ pb: 3, mb: 3, borderBottom: 1, borderColor: "divider" }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h1" variant="h5">
                  {title}
                </Typography>
                {description && (
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.75, maxWidth: 720 }}
                  >
                    {description}
                  </Typography>
                )}
              </Box>
              {actions}
            </Stack>
            {children}
          </Box>
        </Box>
      </Container>
    </>
  );
}
