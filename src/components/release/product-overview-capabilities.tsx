"use client";

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
          Capabilities{" "}
          <Box component="span" color="text.secondary" ml={0.75}>
            {capabilities.length}
          </Box>
        </Typography>
        <Button size="small" color="inherit" onClick={onManage}>
          View catalog
        </Button>
      </Stack>
      {capabilities.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No capabilities defined. Add the outcomes people expect from this
          product.
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
              Outcome / owner
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Capability checks
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Declared mappings
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
                    {capability.ownerLabel || "No owner assigned"}
                    {capability.archived ? " · Archived" : ""}
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
                        ? "Not assessed"
                        : capability.inclusion === "excluded"
                          ? "Excluded"
                          : capability.inclusion === "unknown"
                            ? "Coverage unavailable"
                            : "Not in assessment"}
                    </Typography>
                  )}
                  {capability.inclusion === "included" && (
                    <Typography variant="caption" color="text.secondary">
                      {capability.required === 0
                        ? "No required checks"
                        : `${capability.passed}/${capability.required} required checks pass`}
                    </Typography>
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ gridColumn: { xs: 1, md: "auto" } }}
                >
                  {capability.componentCount} components ·{" "}
                  {capability.screenCount} screens
                  {capability.newerDefinition ? " · Definition changed" : ""}
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
                  {capability.outcome || "No outcome described."}
                </Typography>
                {capability.scope?.scopeReason && (
                  <Typography variant="body2" color="text.secondary">
                    Scope: {capability.scope.scopeReason}
                  </Typography>
                )}
                {capability.missingAcceptance && (
                  <Typography variant="body2" color="warning.main">
                    No required functional acceptance check is defined.
                  </Typography>
                )}
                {capability.newerDefinition && (
                  <Typography variant="body2" color="text.secondary">
                    This assessment retains definition{" "}
                    {capability.scope?.definitionRevision}. The catalog has a
                    newer definition; its changes have not been assessed here.
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Check status applies to this candidate. Mappings describe
                  declared connections; they do not verify behavior or
                  production availability.
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
