"use client";

import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { designTokens } from "@/lib/design-tokens";

/** Keeps the assessment title, view navigation and reading surface in one layout. */
export function WorkspaceFrame({
  header,
  navigation,
  children,
}: {
  header: ReactNode;
  navigation: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: designTokens.layout.content,
        py: { xs: 2.5, md: 4 },
        px: { xs: 2, sm: 3, lg: 4 },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: `${designTokens.layout.navigation} minmax(0, 1fr)`,
          },
          gridTemplateAreas: {
            xs: '"header" "navigation" "content"',
            lg: '"navigation header" "navigation content"',
          },
          columnGap: { lg: 4 },
          rowGap: 3,
          alignItems: "start",
        }}
      >
        <Box sx={{ gridArea: "header", minWidth: 0 }}>{header}</Box>
        <Box
          sx={{
            gridArea: "navigation",
            minWidth: 0,
            position: { lg: "sticky" },
            top: { lg: 92 },
          }}
        >
          {navigation}
        </Box>
        <Box
          component="main"
          id="workspace-content"
          sx={{ gridArea: "content", minWidth: 0 }}
        >
          {children}
        </Box>
      </Box>
    </Container>
  );
}
