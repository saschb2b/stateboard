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
}: {
  product: ProductContext;
  detail: ReleaseDetail;
  readiness: ReleaseEvaluation;
  onReviewView?: (view: ReleaseView, capabilityId?: string) => void;
  screensHref?: string;
}) {
  const t = useTranslations("Product");
  const [capabilityId, setCapabilityId] = useState("all");
  const included = detail.scope.filter((item) => item.included);
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
          onChange={(event) => setCapabilityId(event.target.value)}
        >
          <MenuItem value="all">{t("allScreens")}</MenuItem>
          {included.map((item) => (
            <MenuItem key={item.capabilityId} value={item.capabilityId}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        {onReviewView && (
          <Stack direction="row" gap={0.5} flexWrap="wrap">
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
          <Typography variant="subtitle2" sx={{ px: 2, py: 1.5 }}>
            {screen.label ?? t("productScreen")}
          </Typography>
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
                  direction="row"
                  alignItems="center"
                  gap={1}
                  flexWrap="wrap"
                  sx={{
                    py: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  <StateChip state={region.state} size="sm" />
                  <Typography variant="body2">
                    {region.label ?? t("region")}
                  </Typography>
                  {product.regionCapabilities
                    .filter((link) => link.regionId === region.id)
                    .map((link) => (
                      <Stack
                        key={link.capabilityId}
                        direction="row"
                        gap={1}
                        alignItems="center"
                      >
                        <Typography variant="caption" color="text.secondary">
                          {detail.scope.find(
                            (item) => item.capabilityId === link.capabilityId,
                          )?.name ??
                            product.capabilities.find(
                              (item) => item.id === link.capabilityId,
                            )?.name ??
                            t("capability")}
                        </Typography>
                        <ReadinessChip
                          verification
                          state={
                            readiness.capabilities.find(
                              (item) => item.capabilityId === link.capabilityId,
                            )?.state ?? "needs_evidence"
                          }
                        />
                      </Stack>
                    ))}
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
          {screensHref && (
            <Button component={Link} href={screensHref} sx={{ mt: 1.5 }}>
              {t("manageScreens")}
            </Button>
          )}
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
