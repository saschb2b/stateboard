"use client";

import { useTranslations } from "next-intl";

import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import type { ReleaseView } from "@/lib/release-types";
import { WorkspaceNavigation } from "./workspace-navigation";

const icons = {
  release: <ViewQuiltOutlinedIcon fontSize="small" />,
  visual: <ImageOutlinedIcon fontSize="small" />,
  backend: <AccountTreeOutlinedIcon fontSize="small" />,
  qa: <FactCheckOutlinedIcon fontSize="small" />,
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
  const productT = useTranslations("Product");
  return (
    <WorkspaceNavigation
      label={t("views.label")}
      idPrefix="assessment"
      value={view === "operations" ? "qa" : view}
      onChange={onChange}
      sections={(["release", "qa", "decision"] as const).map((value) => ({
        value,
        label: t(`views.${value}`),
        icon: icons[value],
      }))}
      secondary={{
        label: productT("supportingContext"),
        sections: (["visual", "backend"] as const).map((value) => ({
          value,
          label: t(`views.${value}`),
          icon: icons[value],
        })),
      }}
    />
  );
}
