"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CheckSubjectScope } from "@/components/evidence/check-scope";
import { ReadinessChip } from "@/components/release/readiness-summary";
import type {
  ProductContext,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";
import { dependencyFocus } from "./dependency-focus";

/** Both directions matter: outcome → its architecture, component → affected outcomes. */
export function DependencyView({
  product,
  detail,
  readiness,
  onCheckScopeChange,
}: {
  product: ProductContext;
  detail: ReleaseDetail;
  readiness: ReleaseEvaluation;
  onCheckScopeChange?: (scope: CheckSubjectScope | null) => void;
}) {
  const [capabilityId, setCapabilityId] = useState<string | null>(null);
  const [componentId, setComponentId] = useState<string | null>(null);
  const scope = detail.scope.filter((item) => item.included);
  const focus = dependencyFocus(product, detail, capabilityId, componentId);
  const selectFocus = (capability: string | null, component: string | null) => {
    setCapabilityId(capability);
    setComponentId(component);
    onCheckScopeChange?.(
      dependencyFocus(product, detail, capability, component).checkScope,
    );
  };
  const name = (id: string) =>
    product.components.find((item) => item.id === id)?.name ??
    "Unavailable component";
  const activeChecks = detail.checks.filter(
    (check) => check.archivedAt === null,
  );
  const result = (id: string) =>
    readiness.checks.find((check) => check.checkId === id)?.state ??
    "Not evaluated";
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Architecture for this release</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          fullWidth
          size="small"
          label="Focus on capability"
          value={capabilityId ?? "all"}
          onChange={(event) =>
            selectFocus(
              event.target.value === "all" ? null : event.target.value,
              null,
            )
          }
        >
          <MenuItem value="all">All included capabilities</MenuItem>
          {scope.map((item) => (
            <MenuItem key={item.capabilityId} value={item.capabilityId}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label="Inspect component impact"
          value={componentId ?? "all"}
          onChange={(event) =>
            selectFocus(
              null,
              event.target.value === "all" ? null : event.target.value,
            )
          }
        >
          <MenuItem value="all">Choose a component</MenuItem>
          {focus.assessmentComponents.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {focus.components.length} components in this slice ·{" "}
          {focus.assessmentComponents.length} in this assessment
        </Typography>
        {focus.checkScope && (
          <Button size="small" onClick={() => selectFocus(null, null)}>
            Clear architecture focus
          </Button>
        )}
      </Stack>
      {focus.checkScope && (
        <Typography variant="body2" color="text.secondary">
          Checks below follow this slice. Release-wide checks remain included;
          overall readiness still covers the whole assessment.
        </Typography>
      )}
      {focus.truncated && (
        <Alert severity="warning">
          This view is limited to 200 declared components. Some dependency or
          impact context is outside the slice.
        </Alert>
      )}
      {componentId && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">
            Capabilities affected by {name(componentId)}
          </Typography>
          {focus.impacted.map((item) => (
            <Stack
              key={item.capabilityId}
              direction="row"
              gap={1}
              sx={{ mt: 1 }}
            >
              <Typography>{item.name}</Typography>
              <ReadinessChip
                state={
                  readiness.capabilities.find(
                    (check) => check.capabilityId === item.capabilityId,
                  )?.state ?? "needs_evidence"
                }
              />
            </Stack>
          ))}
          {focus.impacted.length === 0 && (
            <Typography color="text.secondary">
              No declared path to an included capability.
            </Typography>
          )}
        </Paper>
      )}
      {focus.components.length === 0 && (
        <Alert severity="info">
          No dependencies are declared for this slice. Absence of a declared
          connection does not prove independence.
        </Alert>
      )}
      {focus.components.map((item) => {
        const componentChecks = activeChecks.filter(
          (check) =>
            check.subjectType === "component" && check.subjectId === item.id,
        );
        const outcomeLinks = product.capabilityComponents.filter(
          (link) =>
            link.componentId === item.id &&
            focus.capabilityIds.includes(link.capabilityId),
        );
        return (
          <Paper key={item.id} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1">{item.name}</Typography>
              <Chip label={item.kind} size="small" />
            </Stack>
            <Typography variant="body2">{item.description}</Typography>
            <Typography variant="caption" color="text.secondary">
              Accountable: {item.ownerLabel}
            </Typography>
            {item.ownerNeedsReassignment && (
              <Typography variant="body2" color="warning.main">
                Owner membership ended; review accountability.
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Component-specific verification
            </Typography>
            {componentChecks.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No component-specific verification configured
              </Typography>
            )}
            {componentChecks.map((check) => (
              <Typography key={check.id} variant="body2" sx={{ mt: 0.5 }}>
                {check.claim} · {result(check.id)} · {check.environment} ·{" "}
                {check.required ? "Required check" : "Optional check"}
              </Typography>
            ))}
            {outcomeLinks.length > 0 && (
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Linked outcome claims
              </Typography>
            )}
            {outcomeLinks.map((link) => (
              <Stack key={link.capabilityId} spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="body2">
                  {
                    scope.find(
                      (item) => item.capabilityId === link.capabilityId,
                    )?.name
                  }{" "}
                  → {link.relation} ·{" "}
                  {link.required ? "Required dependency" : "Supporting context"}{" "}
                  · {link.description}
                </Typography>
                {activeChecks
                  .filter(
                    (check) =>
                      check.subjectType === "capability" &&
                      check.subjectId === link.capabilityId,
                  )
                  .map((check) => (
                    <Typography
                      key={check.id}
                      variant="body2"
                      color="text.secondary"
                    >
                      {check.claim} · {result(check.id)} ·{" "}
                      {check.required ? "Required check" : "Optional check"}
                    </Typography>
                  ))}
              </Stack>
            ))}
            {focus.dependencies
              .filter((link) => link.consumerId === item.id)
              .map((link) => (
                <Typography key={link.id} variant="body2" sx={{ mt: 1 }}>
                  {item.name} → {link.relation} → {name(link.providerId)} ·{" "}
                  {link.required ? "Required dependency" : "Supporting context"}
                  <br />
                  {link.description}
                </Typography>
              ))}
          </Paper>
        );
      })}
      <Typography variant="caption" color="text.secondary">
        These connections are declared by the team. They describe impact; only
        explicitly required checks determine readiness.
      </Typography>
    </Stack>
  );
}
