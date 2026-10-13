"use client";

import { useTranslations } from "next-intl";

import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import type { ReleaseView } from "@/lib/release-types";
import { RELEASE_VIEWS } from "@/lib/release-types";
import { WorkspaceNavigation } from "./workspace-navigation";

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
  const t = useTranslations("Release");
  return (
    <WorkspaceNavigation
      label={t("views.label")}
      idPrefix="assessment"
      value={view}
      onChange={onChange}
      sections={RELEASE_VIEWS.map((value) => ({
        value,
        label: t(`views.${value}`),
        icon: icons[value],
      }))}
    />
  );
}
