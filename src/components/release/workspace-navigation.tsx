"use client";

import { useTranslations } from "next-intl";
import TabScrollButton, {
  type TabScrollButtonProps,
} from "@mui/material/TabScrollButton";
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
  idPrefix,
  secondary,
}: {
  label: string;
  value: T;
  sections: WorkspaceSection<T>[];
  onChange: (value: T) => void;
  idPrefix?: string;
  secondary?: { label: string; sections: WorkspaceSection<T>[] };
}) {
  const theme = useTheme();
  const vertical = useMediaQuery(theme.breakpoints.up("lg"));
  function group(groupLabel: string, items: WorkspaceSection<T>[]) {
    return (
      <Box
        sx={
          secondary && groupLabel === secondary.label
            ? {
                display: { xs: "flex", lg: "block" },
                alignItems: "center",
                gap: 0.5,
              }
            : undefined
        }
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display:
              secondary && groupLabel === secondary.label
                ? "block"
                : { xs: "none", lg: "block" },
            px: 1.5,
            mb: { xs: 0, lg: 0.75 },
            flexShrink: 0,
            maxWidth: { xs: 120, lg: "none" },
          }}
        >
          {groupLabel}
        </Typography>
        <Tabs
          value={
            items.some((section) => section.value === value) ? value : false
          }
          onChange={(_, next: T) => onChange(next)}
          orientation={vertical ? "vertical" : "horizontal"}
          variant="scrollable"
          scrollButtons={vertical ? false : "auto"}
          slots={{ scrollButtons: NavigationScrollButton }}
          allowScrollButtonsMobile
          aria-label={groupLabel}
          sx={{
            minHeight: 40,
            minWidth: 0,
            flex: 1,
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
          {items.map((section) => (
            <Tab
              key={section.value}
              id={idPrefix ? `${idPrefix}-tab-${section.value}` : undefined}
              aria-controls={
                idPrefix ? `${idPrefix}-panel-${section.value}` : undefined
              }
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
  return (
    <Box sx={{ display: "grid", gap: { xs: 1, lg: 3 } }}>
      {group(label, sections)}
      {secondary && group(secondary.label, secondary.sections)}
    </Box>
  );
}

function NavigationScrollButton(props: TabScrollButtonProps) {
  const t = useTranslations("Common");
  return (
    <TabScrollButton
      {...props}
      component="button"
      type="button"
      tabIndex={props.disabled ? -1 : 0}
      aria-disabled={props.disabled}
      onClick={props.disabled ? undefined : props.onClick}
      aria-label={t(
        props.direction === "left" ? "previousSections" : "nextSections",
      )}
    />
  );
}
