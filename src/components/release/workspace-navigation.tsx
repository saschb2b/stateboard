"use client";

import type { ReactElement } from "react";
import {
  Box,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

export interface WorkspaceSection<T extends string> {
  value: T;
  label: string;
  icon: ReactElement;
}

export function WorkspaceNavigation<T extends string>({
  label,
  value,
  sections,
  onChange,
}: {
  label: string;
  value: T;
  sections: WorkspaceSection<T>[];
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const vertical = useMediaQuery(theme.breakpoints.up("lg"));
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: "none", lg: "block" }, px: 1.5, mb: 1.5 }}
      >
        {label}
      </Typography>
      <Tabs
        value={value}
        onChange={(_, next: T) => onChange(next)}
        orientation={vertical ? "vertical" : "horizontal"}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={label}
        sx={{
          minHeight: 40,
          borderBottom: { xs: 1, lg: 0 },
          borderColor: "divider",
          "& .MuiTabs-list": { gap: 0.5 },
          "& .MuiTabs-indicator": { display: { lg: "none" } },
          "& .MuiTab-root": {
            minWidth: 0,
            minHeight: 40,
            px: 1.5,
            gap: 1.25,
            borderRadius: { lg: 1 },
            justifyContent: { lg: "flex-start" },
            color: "text.secondary",
            "&.Mui-selected": {
              color: "text.primary",
              bgcolor: { lg: "action.selected" },
            },
          },
        }}
      >
        {sections.map((section) => (
          <Tab
            key={section.value}
            value={section.value}
            label={section.label}
            iconPosition="start"
            icon={vertical ? section.icon : undefined}
          />
        ))}
      </Tabs>
    </Box>
  );
}
