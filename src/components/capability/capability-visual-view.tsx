"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
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
      !product.regionCapabilities.some(
        (link) => link.capabilityId === item.capabilityId,
      ),
  );
  return (
    <Stack spacing={2}>
      <Typography variant="h6">
        Visual delivery and capability readiness
      </Typography>
      <TextField
        label="Focus on capability"
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
      <Alert severity="info">
        Shipped, mock, and missing describe the visual delivery. Readiness comes
        from required checks for this candidate.
      </Alert>
      {screens.map((screen) => (
        <Paper key={screen.id} sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
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
          <Stack spacing={1} sx={{ mt: 2 }}>
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
                        <Chip
                          size="small"
                          label={
                            detail.scope.find(
                              (item) => item.capabilityId === link.capabilityId,
                            )?.name ??
                            product.capabilities.find(
                              (item) => item.id === link.capabilityId,
                            )?.name ??
                            "Capability"
                          }
                        />
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
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">
            {capabilityId === "all"
              ? "No screenshots have been added to this product."
              : "This capability has no linked screenshot regions."}
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {onReviewView && (
              <>
                <Button onClick={() => onReviewView("backend")}>
                  Inspect dependencies
                </Button>
                <Button onClick={() => onReviewView("qa")}>
                  Inspect checks
                </Button>
              </>
            )}
            {screensHref && (
              <Button component={Link} href={screensHref}>
                Open screens editor
              </Button>
            )}
          </Stack>
        </Paper>
      )}
      {noUI.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">
            Capabilities without visual anchors
          </Typography>
          {noUI.map((item) => (
            <Typography key={item.capabilityId} variant="body2" sx={{ mt: 1 }}>
              {item.name} · {item.ownerLabel}
            </Typography>
          ))}
        </Paper>
      )}
    </Stack>
  );
}
