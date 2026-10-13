"use client";

import type { Ref } from "react";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import type {
  CapabilityComponent,
  ComponentDependency,
  ProductComponent,
  ReleaseCapability,
  ReleaseCheck,
  ReleaseEvaluation,
} from "@/lib/release-types";

function checkSummary(checks: ReleaseCheck[], readiness: ReleaseEvaluation) {
  const results = checks.map((check) => ({
    check,
    state: readiness.checks.find((item) => item.checkId === check.id)?.state,
  }));
  const failures = results.filter(
    ({ check, state }) => check.required && state === "fail",
  ).length;
  const gaps = results.filter(
    ({ check, state }) =>
      check.required && state !== "pass" && state !== "fail",
  ).length;
  const optional = results.filter(
    ({ check, state }) => !check.required && state !== "pass",
  ).length;
  if (failures)
    return {
      label: `${failures} required ${failures === 1 ? "failure" : "failures"}`,
      color: "error.main",
    };
  if (gaps)
    return {
      label: `${gaps} evidence ${gaps === 1 ? "gap" : "gaps"}`,
      color: "warning.main",
    };
  if (optional)
    return {
      label: `${optional} optional ${optional === 1 ? "finding" : "findings"}`,
      color: "warning.main",
    };
  return { label: "Checks passed", color: "success.main" };
}

/** A scan-friendly row; claim and wiring details are available on demand. */
export function DependencyComponentRow({
  component,
  expanded,
  onExpand,
  checks,
  readiness,
  outcomeLinks,
  scope,
  dependencies,
  componentName,
  summaryRef,
  onInspectDependency,
}: {
  component: ProductComponent;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  checks: ReleaseCheck[];
  readiness: ReleaseEvaluation;
  outcomeLinks: CapabilityComponent[];
  scope: ReleaseCapability[];
  dependencies: ComponentDependency[];
  componentName: (id: string) => string;
  summaryRef?: Ref<HTMLDivElement>;
  onInspectDependency?: (componentId: string) => void;
}) {
  const summary =
    checks.length > 0
      ? checkSummary(checks, readiness)
      : {
          label:
            dependencies.length > 0
              ? `${dependencies.length} ${dependencies.length === 1 ? "dependency" : "dependencies"}`
              : "No dependencies",
          color: "text.secondary",
        };
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => onExpand(next)}
      disableGutters
      square
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{
        border: 0,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary
        ref={summaryRef}
        expandIcon={<ExpandMoreRounded fontSize="small" />}
        aria-controls={`component-${component.id}-details`}
        id={`component-${component.id}-summary`}
        sx={{
          px: 2,
          minHeight: 68,
          "& .MuiAccordionSummary-content": { my: 1.5, mr: 2, minWidth: 0 },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          gap={{ xs: 0.5, sm: 2 }}
          sx={{ width: "100%", minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ overflowWrap: "anywhere" }}>
              {component.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {component.kind} · {component.ownerLabel}
              {component.ownerNeedsReassignment && (
                <Box component="span" sx={{ color: "warning.main" }}>
                  {" "}
                  · Owner needs review
                </Box>
              )}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: summary.color,
              textAlign: { xs: "left", sm: "right" },
              flexShrink: 0,
              maxWidth: { xs: "100%", sm: "40%" },
            }}
          >
            {summary.label}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2.5 }}>
        <Stack spacing={2}>
          {component.description && (
            <Typography variant="body2" color="text.secondary">
              {component.description}
            </Typography>
          )}
          {component.referenceUrl && (
            <Link
              href={component.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
            >
              Component reference ↗
            </Link>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(auto-fit, minmax(240px, 1fr))",
              },
              gap: 3,
            }}
          >
            {outcomeLinks.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  Supports
                </Typography>
                {outcomeLinks.map((link) => (
                  <Box key={link.capabilityId}>
                    <Typography variant="body2">
                      {
                        scope.find(
                          (item) => item.capabilityId === link.capabilityId,
                        )?.name
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {link.relation} ·{" "}
                      {link.required
                        ? "Required dependency"
                        : "Supporting context"}
                    </Typography>
                    {link.description && (
                      <Typography variant="body2" color="text.secondary">
                        {link.description}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
            {dependencies.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  Depends on
                </Typography>
                {dependencies.map((link) => (
                  <Box key={link.id}>
                    {onInspectDependency ? (
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        textAlign="left"
                        onClick={() => onInspectDependency(link.providerId)}
                      >
                        {componentName(link.providerId)}
                      </Link>
                    ) : (
                      <Typography variant="body2">
                        {componentName(link.providerId)}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {link.relation} ·{" "}
                      {link.required
                        ? "Required dependency"
                        : "Supporting context"}
                    </Typography>
                    {link.description && (
                      <Typography variant="body2" color="text.secondary">
                        {link.description}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
            {outcomeLinks.length === 0 && dependencies.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No outgoing connections declared.
              </Typography>
            )}
            {checks.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  Component checks
                </Typography>
                {checks.map((check) => {
                  const evaluation = readiness.checks.find(
                    (item) => item.checkId === check.id,
                  );
                  return (
                    <Box key={check.id}>
                      <Typography variant="body2">{check.claim}</Typography>
                      <Typography
                        variant="caption"
                        color={
                          evaluation?.state === "fail"
                            ? "error.main"
                            : evaluation?.state === "pass"
                              ? "success.main"
                              : "warning.main"
                        }
                      >
                        {evaluation?.state ?? "Not evaluated"} ·{" "}
                        {check.required ? "Required" : "Optional"} ·{" "}
                        {check.environment}
                      </Typography>
                      {evaluation && evaluation.state !== "pass" && (
                        <Typography variant="body2" color="text.secondary">
                          {evaluation.reason}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
          {checks.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No component checks defined.
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
