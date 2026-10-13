"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { OverviewCategory } from "@/lib/product-overview";

export function ProductOverviewCoverage({
  categories,
  assessmentHref,
}: {
  categories: OverviewCategory[];
  assessmentHref?: string;
}) {
  const t = useTranslations("Product");
  function description(row: OverviewCategory, hasAssessment: boolean) {
    if (!hasAssessment) return t("coverage.noAssessment");
    if (row.state === "unknown") return t("unavailableCoverage");
    if (row.state === "not_defined") return t("coverage.noChecks");
    if (row.state === "optional_only")
      return t("coverage.optionalOnly", {
        count: row.optional,
        warnings: row.optionalWarnings,
      });
    return t("coverage.required", {
      passed: row.passed,
      count: row.required,
      blockers: row.blockers,
      gaps: row.gaps,
      warnings: row.optionalWarnings,
    });
  }
  return (
    <Box component="section" aria-labelledby="product-coverage-heading">
      <Stack spacing={0.5} mb={1.5}>
        <Typography
          id="product-coverage-heading"
          component="h2"
          variant="subtitle1"
        >
          {t("coverage.title")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("coverage.help")}
        </Typography>
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: "divider" }}>
        {categories.map((row) => {
          const content = (
            <>
              <Typography variant="body2" fontWeight={500}>
                {t(`coverage.categories.${row.category}`)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color:
                    row.state === "blocked"
                      ? "error.main"
                      : row.state === "needs_evidence"
                        ? "warning.main"
                        : "text.secondary",
                  minWidth: 0,
                }}
              >
                {description(row, !!assessmentHref)}
              </Typography>
              {assessmentHref && (
                <ArrowForwardIcon
                  fontSize="small"
                  sx={{
                    color: "text.secondary",
                    gridColumn: { xs: 2, sm: 3 },
                    gridRow: { xs: "1 / 3", sm: 1 },
                    justifySelf: "end",
                  }}
                />
              )}
            </>
          );
          const sx = {
            width: "100%",
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) 24px",
              sm: "180px minmax(0, 1fr) 24px",
            },
            columnGap: 2,
            rowGap: 0.5,
            textAlign: "left",
            py: 1.5,
            px: 1,
            borderBottom: 1,
            borderColor: "divider",
            "&:hover": assessmentHref ? { bgcolor: "action.hover" } : {},
            "&.Mui-focusVisible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: -2,
            },
          } as const;
          return assessmentHref ? (
            <ButtonBase
              key={row.category}
              component={Link}
              href={`${assessmentHref}?view=qa&category=${row.category}`}
              aria-label={t("coverage.review", {
                category: t(`coverage.categories.${row.category}`),
                description: description(row, true),
              })}
              sx={sx}
            >
              {content}
            </ButtonBase>
          ) : (
            <Box key={row.category} sx={sx}>
              {content}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
