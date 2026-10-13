"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { ReleaseSnapshot } from "@/lib/release-types";

export function SnapshotDependencies({
  snapshot,
}: {
  snapshot: ReleaseSnapshot;
}) {
  if (snapshot.components.length === 0) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">Dependencies reviewed</Typography>
      {snapshot.components.map((component) => (
        <Box
          key={component.id}
          sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}
        >
          <Typography variant="subtitle2">
            {component.name} · {component.kind}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {component.ownerLabel}
          </Typography>
          {snapshot.capabilityComponents
            .filter((link) => link.componentId === component.id)
            .map((link) => (
              <Typography key={link.capabilityId} variant="body2">
                {snapshot.scope.find(
                  (item) => item.capabilityId === link.capabilityId,
                )?.name ?? "Recorded capability"}{" "}
                → {link.relation} → {component.name} ·{" "}
                {link.required ? "Required" : "Optional"}
                <br />
                {link.description}
              </Typography>
            ))}
          {snapshot.dependencies
            .filter((link) => link.consumerId === component.id)
            .map((link) => (
              <Typography key={link.id} variant="body2">
                {component.name} → {link.relation} →{" "}
                {snapshot.components.find(
                  (provider) => provider.id === link.providerId,
                )?.name ?? "Recorded component"}{" "}
                · {link.required ? "Required" : "Optional"}
                <br />
                {link.description}
              </Typography>
            ))}
        </Box>
      ))}
    </Stack>
  );
}
