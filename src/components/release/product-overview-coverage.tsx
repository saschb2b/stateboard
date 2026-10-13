"use client";

import Link from "next/link";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { OverviewCategory } from "@/lib/product-overview";
import type { CheckCategory } from "@/lib/release-types";

const labels: Record<CheckCategory, string> = {
  functional: "Functionality",
  integration: "Integration",
  ux: "User experience",
  data: "Data",
  security: "Security",
  operational: "Operations",
};
function description(row: OverviewCategory, hasAssessment: boolean) {
  if (!hasAssessment) return "No assessment yet";
  if (row.state === "unknown") return "Coverage unavailable";
  if (row.state === "not_defined") return "No checks defined";
  if (row.state === "optional_only")
    return `${row.optional} optional check${row.optional === 1 ? "" : "s"} · No required checks${row.optionalWarnings ? ` · ${row.optionalWarnings} optional warning${row.optionalWarnings === 1 ? "" : "s"}` : ""}`;
  return `${row.passed}/${row.required} required pass${row.blockers ? ` · ${row.blockers} failed` : ""}${row.gaps ? ` · ${row.gaps} need evidence` : ""}${row.optionalWarnings ? ` · ${row.optionalWarnings} optional warnings` : ""}`;
}
export function ProductOverviewCoverage({
  categories,
  assessmentHref,
}: {
  categories: OverviewCategory[];
  assessmentHref?: string;
}) {
  return (
    <Box component="section" aria-labelledby="product-coverage-heading">
      <Stack spacing={0.5} mb={1.5}>
        <Typography
          id="product-coverage-heading"
          component="h2"
          variant="subtitle1"
        >
          Verification coverage
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Checks for the latest assessment. An area without checks remains
          unassessed.
        </Typography>
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: "divider" }}>
        {categories.map((row) => {
          const content = (
            <>
              <Typography variant="body2" fontWeight={500}>
                {labels[row.category]}
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
              aria-label={`${labels[row.category]}: ${description(row, true)}. Review checks`}
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
