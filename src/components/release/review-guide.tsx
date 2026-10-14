"use client";

import { useTranslations } from "next-intl";
import { Box, Stack, Typography } from "@mui/material";

export function ReviewGuide() {
  const t = useTranslations("Product");
  return (
    <Box component="details">
      <Typography
        component="summary"
        variant="body2"
        color="text.secondary"
        sx={{ cursor: "pointer", width: "fit-content" }}
      >
        {t("reviewGuide.title")}
      </Typography>
      <Stack component="ol" spacing={1} sx={{ pl: 2.5, mb: 1, maxWidth: 740 }}>
        {(["features", "checks", "results", "decision"] as const).map(
          (step) => (
            <Typography key={step} component="li" variant="body2">
              {t(`reviewGuide.${step}`)}
            </Typography>
          ),
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 740 }}>
        {t("reviewGuide.optional")}
      </Typography>
    </Box>
  );
}
