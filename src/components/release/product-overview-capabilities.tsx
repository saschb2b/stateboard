"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Box, Button, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { OverviewCapability } from "@/lib/product-overview";
import { ReadinessChip } from "./readiness-summary";

const columns = {
  xs: "minmax(0, 1fr) 20px",
  md: "minmax(0, 1fr) 170px 170px 20px",
};
export function ProductOverviewCapabilities({
  capabilities,
  hasAssessment,
  onManage,
}: {
  capabilities: OverviewCapability[];
  hasAssessment: boolean;
  onManage: () => void;
}) {
  const t = useTranslations("Product");
  const format = useFormatter();
  return (
    <Box component="section" aria-labelledby="product-capabilities-heading">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1.5}
        gap={2}
      >
        <Typography
          id="product-capabilities-heading"
          component="h2"
          variant="subtitle1"
        >
          {t("capabilities")}{" "}
          <Box component="span" color="text.secondary" ml={0.75}>
            {format.number(capabilities.length)}
          </Box>
        </Typography>
        <Button size="small" color="inherit" onClick={onManage}>
          {t("viewCatalog")}
        </Button>
      </Stack>
      {capabilities.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("noCapabilities")}
        </Typography>
      ) : (
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: columns,
              gap: 2,
              px: 2,
              py: 1,
              bgcolor: "action.hover",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {t("outcomeOwner")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("capabilityChecks")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("declaredMappings")}
            </Typography>
          </Box>
          {capabilities.map((capability, index) => (
            <Box
              key={capability.capabilityId}
              component="details"
              sx={{
                bgcolor: "background.paper",
                borderTop: index ? 1 : 0,
                borderColor: "divider",
                "&[open] .capability-chevron": { transform: "rotate(180deg)" },
              }}
            >
              <Box
                component="summary"
                sx={{
                  display: "grid",
                  gridTemplateColumns: columns,
                  gap: { xs: 1, md: 2 },
                  alignItems: "center",
                  px: 2,
                  py: 1.75,
                  cursor: "pointer",
                  listStyle: "none",
                  "&::-webkit-details-marker": { display: "none" },
                  "&:hover": { bgcolor: "action.hover" },
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: -2,
                  },
                }}
              >
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {capability.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {capability.ownerLabel || t("noOwner")}
                    {capability.archived ? t("archivedSuffix") : ""}
                  </Typography>
                </Stack>
                <Stack
                  spacing={0.25}
                  alignItems="flex-start"
                  sx={{ gridColumn: { xs: 1, md: "auto" } }}
                >
                  {capability.state ? (
                    <ReadinessChip state={capability.state} verification />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {!hasAssessment
                        ? t("notAssessed")
                        : capability.inclusion === "excluded"
                          ? t("excluded")
                          : capability.inclusion === "unknown"
                            ? t("unavailableCoverage")
                            : t("notInAssessment")}
                    </Typography>
                  )}
                  {capability.inclusion === "included" && (
                    <Typography variant="caption" color="text.secondary">
                      {capability.required === 0
                        ? t("noRequiredChecks")
                        : t("requiredPass", {
                            passed: capability.passed,
                            count: capability.required,
                          })}
                    </Typography>
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ gridColumn: { xs: 1, md: "auto" } }}
                >
                  {t("mappingCounts", {
                    components: capability.componentCount,
                    screens: capability.screenCount,
                  })}
                  {capability.newerDefinition
                    ? t("definitionChangedSuffix")
                    : ""}
                </Typography>
                <ExpandMoreIcon
                  className="capability-chevron"
                  fontSize="small"
                  sx={{
                    color: "text.secondary",
                    gridColumn: { xs: 2, md: "auto" },
                    gridRow: { xs: 1, md: "auto" },
                  }}
                />
              </Box>
              <Stack spacing={1} sx={{ px: 2, pb: 2, maxWidth: 850 }}>
                <Typography variant="body2">
                  {capability.outcome || t("noOutcome")}
                </Typography>
                {capability.scope?.scopeReason && (
                  <Typography variant="body2" color="text.secondary">
                    {t("scopeReason", { reason: capability.scope.scopeReason })}
                  </Typography>
                )}
                {capability.missingAcceptance && (
                  <Typography variant="body2" color="warning.main">
                    {t("missingAcceptance")}
                  </Typography>
                )}
                {capability.newerDefinition && (
                  <Typography variant="body2" color="text.secondary">
                    {t("retainedDefinition", {
                      revision: capability.scope?.definitionRevision ?? 0,
                    })}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {t("candidateCheckScope")}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
