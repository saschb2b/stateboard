"use client";

import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import type { ReleaseView } from "@/lib/release-types";
import { RELEASE_VIEWS } from "@/lib/release-types";
import { WorkspaceNavigation } from "./workspace-navigation";

export const VIEW_LABELS: Record<ReleaseView, string> = {
  release: "Overview",
  visual: "Screens",
  backend: "Architecture",
  qa: "Checks",
  operations: "Operations",
  decision: "Decision",
};
const icons = {
  release: <ViewQuiltOutlinedIcon fontSize="small" />,
  visual: <ImageOutlinedIcon fontSize="small" />,
  backend: <AccountTreeOutlinedIcon fontSize="small" />,
  qa: <FactCheckOutlinedIcon fontSize="small" />,
  operations: <DnsOutlinedIcon fontSize="small" />,
  decision: <GavelOutlinedIcon fontSize="small" />,
};
export function ReleaseViewTabs({
  view,
  onChange,
}: {
  view: ReleaseView;
  onChange: (view: ReleaseView) => void;
}) {
  return (
    <WorkspaceNavigation
      label="Assessment perspective"
      value={view}
      onChange={onChange}
      sections={RELEASE_VIEWS.map((value) => ({
        value,
        label: VIEW_LABELS[value],
        icon: icons[value],
      }))}
    />
  );
}
