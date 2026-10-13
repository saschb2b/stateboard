"use client";

import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import { RegionOverlay } from "@/components/region/region-overlay";
import { StateChip } from "@/components/region/state-chip";
import { ReadinessChip } from "./readiness-summary";
import type { ReleaseSnapshot } from "@/lib/release-types";

/** Every image, annotation, and association comes from the reviewed snapshot. */
export function SnapshotVisuals({ snapshot }: { snapshot: ReleaseSnapshot }) {
  const capturedFiles = new Set(
    snapshot.screens.map((screen) => screen.filename),
  );
  const supporting = snapshot.assets.filter(
    (asset) => !capturedFiles.has(asset.filename),
  );
  const associations = snapshot.regionCapabilities ?? [];
  return (
    <Stack spacing={2}>
      {snapshot.screens.length > 0 && (
        <Typography variant="subtitle1">
          Captured screens and visual delivery
        </Typography>
      )}
      {snapshot.screens.length > 0 &&
        snapshot.regionCapabilities === undefined && (
          <Alert severity="info">
            Capability links were not captured in this older review. Its saved
            annotations remain visible.
          </Alert>
        )}
      {snapshot.screens.map((screen) => (
        <Paper key={screen.id} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">
              {screen.label ?? "Captured screen"}
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
                alt={screen.label ?? "Captured screen"}
                width={screen.width}
                height={screen.height}
                sx={{ width: "100%", height: "100%", display: "block" }}
              />
              <RegionOverlay regions={screen.regions} />
            </Box>
            {screen.regions.map((region) => (
              <Stack key={region.id} spacing={0.5}>
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  flexWrap="wrap"
                >
                  <StateChip state={region.state} size="sm" />
                  <Typography variant="body2">
                    {region.label ?? "Recorded region"}
                  </Typography>
                  {associations
                    .filter((association) => association.regionId === region.id)
                    .map((association) => {
                      const capability = snapshot.scope.find(
                        (item) =>
                          item.capabilityId === association.capabilityId,
                      );
                      const readiness = snapshot.readiness.capabilities.find(
                        (item) =>
                          item.capabilityId === association.capabilityId,
                      );
                      return (
                        <Stack
                          key={association.capabilityId}
                          direction="row"
                          gap={1}
                          alignItems="center"
                        >
                          <Typography variant="body2">
                            Linked to{" "}
                            {capability?.name ?? "Recorded capability"}
                          </Typography>
                          {readiness && (
                            <ReadinessChip state={readiness.state} />
                          )}
                        </Stack>
                      );
                    })}
                </Stack>
                {region.notes && (
                  <Typography variant="caption" color="text.secondary">
                    {region.notes}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Paper>
      ))}
      {supporting.length > 0 && (
        <Typography variant="subtitle1">Supporting images retained</Typography>
      )}
      {supporting.map((asset) => (
        <Stack key={asset.id} spacing={0.5}>
          <Typography variant="body2">{asset.label}</Typography>
          <Box
            component="img"
            src={`/api/release-assets/${asset.id}`}
            alt={asset.label}
            sx={{
              width: "100%",
              maxHeight: 420,
              objectFit: "contain",
              bgcolor: "background.default",
            }}
          />
        </Stack>
      ))}
    </Stack>
  );
}
