"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { RegionOverlay } from "@/components/region/region-overlay";
import { StateChip } from "@/components/region/state-chip";
import { ReadinessChip } from "@/components/release/readiness-summary";
import { VerificationMethod } from "@/components/evidence/verification-method";
import type {
  ProductContext,
  ReleaseDetail,
  ReleaseEvaluation,
  ReleaseView,
} from "@/lib/release-types";

export function CapabilityVisualView({
  product,
  detail,
  readiness,
  onReviewView,
  screensHref,
  selectedCapabilityId,
  onCapabilityChange,
}: {
  product: ProductContext;
  detail: ReleaseDetail;
  readiness: ReleaseEvaluation;
  onReviewView?: (view: ReleaseView, capabilityId?: string) => void;
  screensHref?: string;
  selectedCapabilityId?: string | null;
  onCapabilityChange?: (capabilityId: string | null) => void;
}) {
  const t = useTranslations("Product");
  const [localCapabilityId, setLocalCapabilityId] = useState("all");
  const included = detail.scope.filter((item) => item.included);
  const requestedCapabilityId =
    selectedCapabilityId === undefined
      ? localCapabilityId
      : selectedCapabilityId;
  const capabilityId =
    requestedCapabilityId &&
    included.some((item) => item.capabilityId === requestedCapabilityId)
      ? requestedCapabilityId
      : "all";
  const linked = product.regionCapabilities.filter(
    (link) =>
      included.some((item) => item.capabilityId === link.capabilityId) &&
      (capabilityId === "all" || link.capabilityId === capabilityId),
  );
  const regionIds = new Set(linked.map((link) => link.regionId));
  const screens =
    capabilityId === "all"
      ? product.screens
      : product.screens.filter((screen) =>
          screen.regions.some((region) => regionIds.has(region.id)),
        );
  const noUI = included.filter(
    (item) =>
      (capabilityId === "all" || item.capabilityId === capabilityId) &&
      !product.regionCapabilities.some(
        (link) => link.capabilityId === item.capabilityId,
      ),
  );
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={1}
      >
        <TextField
          label={t("capability")}
          value={capabilityId}
          select
          fullWidth
          size="small"
          sx={{ flex: 1, minWidth: 0 }}
          onChange={(event) => {
            const next = event.target.value;
            setLocalCapabilityId(next);
            onCapabilityChange?.(next === "all" ? null : next);
          }}
        >
          <MenuItem value="all">{t("allScreens")}</MenuItem>
          {included.map((item) => (
            <MenuItem key={item.capabilityId} value={item.capabilityId}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        {(onReviewView || screensHref) && (
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {screensHref && (
              <Button component={Link} href={screensHref} size="small">
                {t("manageScreens")}
              </Button>
            )}
            {onReviewView && (
              <>
                <Button
                  size="small"
                  onClick={() =>
                    onReviewView(
                      "backend",
                      capabilityId === "all" ? undefined : capabilityId,
                    )
                  }
                >
                  {t("viewArchitecture")}
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    onReviewView(
                      "qa",
                      capabilityId === "all" ? undefined : capabilityId,
                    )
                  }
                >
                  {t("viewChecks")}
                </Button>
              </>
            )}
          </Stack>
        )}
      </Stack>
      {screens.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {t("annotationHelp")}
        </Typography>
      )}
      {screens.map((screen) => (
        <Paper key={screen.id} sx={{ overflow: "hidden" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            flexWrap="wrap"
            sx={{ px: 2, py: 1.5 }}
          >
            <Typography
              variant="subtitle2"
              sx={{ minWidth: 0, overflowWrap: "anywhere" }}
            >
              {screen.label ?? t("productScreen")}
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button
                component="a"
                href={screen.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                aria-label={`${t("openFullSizeScreen")}: ${screen.label ?? t("productScreen")}`}
              >
                {t("openFullSizeScreen")}
              </Button>
              {screensHref && (
                <Button
                  component={Link}
                  href={`${screensHref}${screensHref.includes("?") ? "&" : "?"}screen=${encodeURIComponent(screen.id)}`}
                  size="small"
                  sx={{ flexShrink: 0 }}
                  aria-label={`${t("editScreen")}: ${screen.label ?? t("productScreen")}`}
                >
                  {t("editScreen")}
                </Button>
              )}
            </Stack>
          </Stack>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: `${screen.width} / ${screen.height}`,
            }}
          >
            <Box
              component="img"
              src={screen.mediaUrl}
              alt={screen.label ?? t("productScreen")}
              sx={{ width: "100%", height: "100%", display: "block" }}
            />
            <RegionOverlay
              regions={
                capabilityId === "all"
                  ? screen.regions
                  : screen.regions.filter((region) => regionIds.has(region.id))
              }
            />
          </Box>
          <Stack sx={{ px: 2, py: 0.5 }}>
            {screen.regions
              .filter(
                (region) => capabilityId === "all" || regionIds.has(region.id),
              )
              .map((region) => (
                <Stack
                  key={region.id}
                  gap={1}
                  sx={{
                    py: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    <StateChip state={region.state} size="sm" />
                    <Typography
                      variant="body2"
                      sx={{ overflowWrap: "anywhere", minWidth: 0 }}
                    >
                      {region.label ?? t("region")}
                    </Typography>
                  </Stack>
                  {product.regionCapabilities
                    .filter((link) => link.regionId === region.id)
                    .map((link) => {
                      const scope = detail.scope.find(
                        (item) => item.capabilityId === link.capabilityId,
                      );
                      const name =
                        scope?.name ??
                        product.capabilities.find(
                          (item) => item.id === link.capabilityId,
                        )?.name ??
                        t("capability");
                      return (
                        <Stack
                          key={link.capabilityId}
                          direction="row"
                          gap={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          {onReviewView && scope?.included ? (
                            <Button
                              size="small"
                              sx={{
                                justifyContent: "flex-start",
                                textAlign: "left",
                                overflowWrap: "anywhere",
                                minWidth: 0,
                                p: 0,
                              }}
                              aria-label={t("viewFeatureChecks", { name })}
                              onClick={() =>
                                onReviewView("qa", link.capabilityId)
                              }
                            >
                              {name}
                            </Button>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ overflowWrap: "anywhere", minWidth: 0 }}
                            >
                              {name}
                            </Typography>
                          )}
                          {scope?.included ? (
                            <ReadinessChip
                              verification
                              state={
                                readiness.capabilities.find(
                                  (item) =>
                                    item.capabilityId === link.capabilityId,
                                )?.state ?? "needs_evidence"
                              }
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {scope ? t("excluded") : t("notInAssessment")}
                            </Typography>
                          )}
                        </Stack>
                      );
                    })}
                  {region.notes && (
                    <Box component="details">
                      <Typography
                        component="summary"
                        variant="caption"
                        color="text.secondary"
                        sx={{ cursor: "pointer", width: "fit-content" }}
                      >
                        {t("screenNotes")}
                      </Typography>
                      <Box sx={{ pt: 1 }}>
                        <VerificationMethod text={region.notes} />
                      </Box>
                    </Box>
                  )}
                </Stack>
              ))}
          </Stack>
        </Paper>
      ))}
      {screens.length === 0 && (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <Typography variant="subtitle1">
            {capabilityId === "all" ? t("noScreens") : t("noLinkedScreen")}
          </Typography>
        </Box>
      )}
      {noUI.length > 0 && (
        <Box
          component="details"
          sx={{ borderTop: 1, borderColor: "divider", py: 1.5 }}
        >
          <Typography
            component="summary"
            variant="body2"
            color="text.secondary"
            sx={{ cursor: "pointer" }}
          >
            {t("withoutScreenCount", { count: noUI.length })}
          </Typography>
          <Stack sx={{ mt: 1.5 }}>
            {noUI.map((item) => (
              <Stack
                key={item.capabilityId}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                sx={{ py: 1 }}
              >
                <Box>
                  <Typography variant="body2">{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.ownerLabel}
                  </Typography>
                </Box>
                <ReadinessChip
                  verification
                  state={
                    readiness.capabilities.find(
                      (capability) =>
                        capability.capabilityId === item.capabilityId,
                    )?.state ?? "needs_evidence"
                  }
                />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
