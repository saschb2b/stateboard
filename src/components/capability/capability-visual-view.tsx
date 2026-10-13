"use client";

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
  onReviewView?: (view: ReleaseView) => void;
  screensHref?: string;
}) {
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
      <TextField
        label="Capability"
        value={capabilityId}
        select
        size="small"
        onChange={(event) => setCapabilityId(event.target.value)}
      >
        <MenuItem value="all">All screens</MenuItem>
        {included.map((item) => (
          <MenuItem key={item.capabilityId} value={item.capabilityId}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>
      {screens.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Annotations show shipped, mock, or missing UI. Checks verify the
          candidate.
        </Typography>
      )}
      {screens.map((screen) => (
        <Paper key={screen.id} sx={{ overflow: "hidden" }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1.5 }}>
            {screen.label ?? "Product screen"}
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
              alt={screen.label ?? "Product screen"}
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
                    {region.label ?? "Region"}
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
                            "Capability"}
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
            {capabilityId === "all" ? "No screens yet" : "No linked screen"}
          </Typography>
          <Stack
            direction="row"
            justifyContent="center"
            gap={1}
            flexWrap="wrap"
            sx={{ mt: 1.5 }}
          >
            {onReviewView && (
              <>
                <Button onClick={() => onReviewView("backend")}>
                  View architecture
                </Button>
                <Button onClick={() => onReviewView("qa")}>View checks</Button>
              </>
            )}
            {screensHref && (
              <Button component={Link} href={screensHref}>
                Manage screens
              </Button>
            )}
          </Stack>
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
            {noUI.length} {noUI.length === 1 ? "capability" : "capabilities"}{" "}
            without a linked screen
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
