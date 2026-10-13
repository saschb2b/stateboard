"use client";

import { useTranslations } from "next-intl";

import { Box, Stack, Typography } from "@mui/material";
import type { ReleaseSnapshot } from "@/lib/release-types";

export function SnapshotDependencies({
  snapshot,
}: {
  snapshot: ReleaseSnapshot;
}) {
  const t = useTranslations("Release");
  const tp = useTranslations("Product");
  if (snapshot.components.length === 0) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">{t("snapshot.dependencies")}</Typography>
      {snapshot.components.map((component) => (
        <Box
          key={component.id}
          sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}
        >
          <Typography variant="subtitle2">
            {component.name} · {tp(`kinds.${component.kind}`)}
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
                )?.name ?? t("common.recordedCapability")}{" "}
                → {link.relation} → {component.name} ·{" "}
                {link.required ? t("common.required") : t("common.optional")}
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
                )?.name ?? t("common.recordedComponent")}{" "}
                · {link.required ? t("common.required") : t("common.optional")}
                <br />
                {link.description}
              </Typography>
            ))}
        </Box>
      ))}
    </Stack>
  );
}
