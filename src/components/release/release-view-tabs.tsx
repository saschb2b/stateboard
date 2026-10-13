"use client";

import { Tabs, Tab } from "@mui/material";
import type { ReleaseView } from "@/lib/release-types";
import { RELEASE_VIEWS } from "@/lib/release-types";

export const VIEW_LABELS: Record<ReleaseView, string> = {
  release: "Overview",
  visual: "Screens",
  backend: "Architecture",
  qa: "Checks",
  operations: "Operations",
  decision: "Decision",
};
export function ReleaseViewTabs({
  view,
  onChange,
}: {
  view: ReleaseView;
  onChange: (view: ReleaseView) => void;
}) {
  return (
    <Tabs
      value={view}
      onChange={(_, value: ReleaseView) => onChange(value)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      aria-label="Assessment perspective"
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        minHeight: 44,
        "& .MuiTab-root": { minHeight: 44, minWidth: 0, px: 2 },
      }}
    >
      {RELEASE_VIEWS.map((item) => (
        <Tab key={item} value={item} label={VIEW_LABELS[item]} />
      ))}
    </Tabs>
  );
}
