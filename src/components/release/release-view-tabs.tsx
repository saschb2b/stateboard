"use client";

import { Tabs, Tab } from "@mui/material";
import type { ReleaseView } from "@/lib/release-types";
import { RELEASE_VIEWS } from "@/lib/release-types";

export const VIEW_LABELS: Record<ReleaseView, string> = {
  release: "Release / product",
  visual: "Visual / frontend",
  backend: "Backend",
  qa: "QA",
  operations: "Operations / security / data",
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
      aria-label="Assessment perspective"
    >
      {RELEASE_VIEWS.map((item) => (
        <Tab key={item} value={item} label={VIEW_LABELS[item]} />
      ))}
    </Tabs>
  );
}
