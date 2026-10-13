"use client";

import { useTranslations } from "next-intl";

import { Box, Stack, Typography } from "@mui/material";
import { MONO_FONT } from "@/lib/theme";
import type { ReleaseAssessment } from "@/lib/release-types";

export function ReleaseContext({
  assessment,
  collapsible = false,
}: {
  assessment: ReleaseAssessment;
  collapsible?: boolean;
}) {
  const t = useTranslations("Release");
  return (
    <Box component={collapsible ? "details" : "div"} sx={{ minWidth: 0 }}>
      {collapsible && (
        <Typography
          component="summary"
          variant="body2"
          color="text.secondary"
          sx={{
            cursor: "pointer",
            width: "fit-content",
            "&:hover": { color: "text.primary" },
          }}
        >
          {t("context.details")}
        </Typography>
      )}
      <Stack component="dl" spacing={1} sx={{ m: 0, mt: collapsible ? 2 : 0 }}>
        {[
          {
            label: t("context.candidate"),
            value: assessment.candidateRef,
            monospace: true,
          },
          {
            label: t("context.validation"),
            value: assessment.validationEnvironment,
          },
          { label: t("context.target"), value: assessment.targetEnvironment },
          { label: t("context.audience"), value: assessment.audience },
          {
            label: t("context.configuration"),
            value: assessment.configurationRef,
          },
          { label: t("context.owner"), value: assessment.ownerLabel },
        ].map(({ label, value, monospace }) => (
          <Box
            key={label}
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 140px) minmax(0, 1fr)",
              gap: 1,
            }}
          >
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant="caption"
              sx={{
                m: 0,
                overflowWrap: "anywhere",
                ...(monospace ? { fontFamily: MONO_FONT } : {}),
              }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
