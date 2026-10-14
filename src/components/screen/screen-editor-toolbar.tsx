"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import { REGION_STATES, type RegionState } from "@/lib/types";

interface ScreenEditorToolbarProps {
  name: string;
  regionCount: number;
  readOnly: boolean;
  totals: Record<RegionState, number>;
  filterState: RegionState | null;
  onFilter: (state: RegionState) => void;
  onSearch: () => void;
  onPresent: () => void;
  onCopyShare: () => void;
  copied: boolean;
  shareHref?: string;
  sharingSettingsHref: string;
  reviewHref?: string;
}

export function ScreenEditorToolbar({
  name,
  regionCount,
  readOnly,
  totals,
  filterState,
  onFilter,
  onSearch,
  onPresent,
  onCopyShare,
  copied,
  shareHref,
  sharingSettingsHref,
  reviewHref,
}: ScreenEditorToolbarProps) {
  const t = useTranslations("Visual");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null);
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="h1"
            variant="subtitle1"
            sx={{ fontWeight: 650, overflowWrap: "anywhere", lineHeight: 1.4 }}
          >
            {name}
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {t("regionCount", { count: regionCount })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {readOnly ? t("tapRegion") : t("canvasDrawHint")}
            </Typography>
            {reviewHref ? (
              <Button
                component={Link}
                href={reviewHref}
                size="small"
                color="inherit"
                startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
                sx={{ p: 0, minHeight: 0, fontSize: 12, lineHeight: 1.5 }}
              >
                {t("backToReleaseReview")}
              </Button>
            ) : null}
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          flexWrap="wrap"
          sx={{ flexShrink: 0 }}
        >
          <Tooltip title={t("searchShortcut")}>
            <Button
              color="inherit"
              size="small"
              startIcon={<SearchIcon />}
              onClick={onSearch}
            >
              {t("find")}
            </Button>
          </Tooltip>
          {totals.shipped + totals.mock + totals.missing > 0 ? (
            <Button
              color={filterState ? "primary" : "inherit"}
              size="small"
              startIcon={<FilterListIcon />}
              aria-haspopup="menu"
              aria-expanded={Boolean(filterAnchor)}
              onClick={(event) => setFilterAnchor(event.currentTarget)}
            >
              {filterState
                ? t(`states.${filterState}.label`)
                : t("filterRegions")}
            </Button>
          ) : null}
          <Tooltip title={t("presentShortcut")}>
            <Button
              color="inherit"
              size="small"
              startIcon={<SlideshowIcon />}
              onClick={onPresent}
            >
              {t("present")}
            </Button>
          </Tooltip>
          {!readOnly ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<ShareOutlinedIcon />}
              aria-haspopup="menu"
              aria-expanded={Boolean(shareAnchor)}
              onClick={(event) => setShareAnchor(event.currentTarget)}
            >
              {t("shareScreens")}
            </Button>
          ) : null}
        </Stack>
      </Stack>
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        {REGION_STATES.map((state) => (
          <MenuItem
            key={state}
            role="menuitemcheckbox"
            aria-checked={filterState === state}
            onClick={() => {
              onFilter(state);
              setFilterAnchor(null);
            }}
          >
            <Box component="span" sx={{ width: 24, height: 20, mr: 1 }}>
              {filterState === state ? <CheckIcon fontSize="small" /> : null}
            </Box>
            {t("filterByState", {
              state: t(`states.${state}.label`),
              count: totals[state],
            })}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={shareAnchor}
        open={Boolean(shareAnchor)}
        onClose={() => setShareAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            onCopyShare();
            setShareAnchor(null);
          }}
        >
          {copied ? t("copied") : t("copyShareLink")}
        </MenuItem>
        {shareHref ? (
          <MenuItem
            component="a"
            href={shareHref}
            target="_blank"
            rel="noopener"
            onClick={() => setShareAnchor(null)}
          >
            {t("openShareViewExternal")}
          </MenuItem>
        ) : null}
        <MenuItem
          component={Link}
          href={sharingSettingsHref}
          onClick={() => setShareAnchor(null)}
        >
          {t("manageLinks")}
        </MenuItem>
      </Menu>
    </Box>
  );
}
