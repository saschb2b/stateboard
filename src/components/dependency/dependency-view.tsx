"use client";

import { useState } from "react";
import {
  Alert,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ReadinessChip } from "@/components/release/readiness-summary";
import type {
  ProductContext,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";

/** Both directions matter: outcome → its architecture, component → affected outcomes. */
export function DependencyView({
  product,
  detail,
  readiness,
}: {
  product: ProductContext;
  detail: ReleaseDetail;
  readiness: ReleaseEvaluation;
}) {
  const [capabilityId, setCapabilityId] = useState("all");
  const [componentId, setComponentId] = useState("all");
  const scope = detail.scope.filter((item) => item.included);
  const seeds = product.capabilityComponents
    .filter(
      (link) =>
        scope.some((item) => item.capabilityId === link.capabilityId) &&
        (capabilityId === "all" || link.capabilityId === capabilityId),
    )
    .map((link) => link.componentId);
  const relevant = new Set(seeds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of product.dependencies) {
      if (relevant.has(link.consumerId) && !relevant.has(link.providerId)) {
        relevant.add(link.providerId);
        changed = true;
      }
    }
  }
  const upstream = new Set(componentId === "all" ? [] : [componentId]);
  changed = true;
  while (changed) {
    changed = false;
    for (const link of product.dependencies) {
      if (upstream.has(link.providerId) && !upstream.has(link.consumerId)) {
        upstream.add(link.consumerId);
        changed = true;
      }
    }
  }
  const impacted = scope.filter((item) =>
    product.capabilityComponents.some(
      (link) =>
        link.capabilityId === item.capabilityId &&
        upstream.has(link.componentId),
    ),
  );
  const components = product.components.filter((item) => relevant.has(item.id));
  const name = (id: string) =>
    product.components.find((item) => item.id === id)?.name ??
    "Unavailable component";
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Architecture for this release</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          fullWidth
          size="small"
          label="Focus on capability"
          value={capabilityId}
          onChange={(event) => setCapabilityId(event.target.value)}
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
          value={componentId}
          onChange={(event) => setComponentId(event.target.value)}
        >
          <MenuItem value="all">Choose a component</MenuItem>
          {product.components.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {componentId !== "all" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">
            Capabilities affected by {name(componentId)}
          </Typography>
          {impacted.map((item) => (
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
                    (result) => result.capabilityId === item.capabilityId,
                  )?.state ?? "needs_evidence"
                }
              />
            </Stack>
          ))}
          {impacted.length === 0 && (
            <Typography color="text.secondary">
              No declared path to an included capability.
            </Typography>
          )}
        </Paper>
      )}
      {components.length === 0 && (
        <Alert severity="info">
          No dependencies are declared for this slice. Absence of a declared
          connection does not prove independence.
        </Alert>
      )}
      {components.map((item) => (
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
          {!detail.checks.some(
            (check) =>
              check.archivedAt === null &&
              check.subjectType === "component" &&
              check.subjectId === item.id,
          ) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No verification configured
            </Typography>
          )}
          {detail.checks
            .filter(
              (check) =>
                check.archivedAt === null &&
                check.subjectType === "component" &&
                check.subjectId === item.id,
            )
            .map((check) => (
              <Typography key={check.id} variant="body2" sx={{ mt: 1 }}>
                {check.claim} ·{" "}
                {readiness.checks.find(
                  (evaluation) => evaluation.checkId === check.id,
                )?.state ?? "Not evaluated"}{" "}
                · {check.environment}
              </Typography>
            ))}
          {product.capabilityComponents
            .filter(
              (link) =>
                link.componentId === item.id &&
                scope.some(
                  (capability) => capability.capabilityId === link.capabilityId,
                ),
            )
            .map((link) => (
              <Typography
                key={link.capabilityId}
                variant="body2"
                sx={{ mt: 1 }}
              >
                {
                  scope.find(
                    (capability) =>
                      capability.capabilityId === link.capabilityId,
                  )?.name
                }{" "}
                → {link.relation} · {link.required ? "Required" : "Optional"} ·{" "}
                {link.description}
              </Typography>
            ))}
          {product.dependencies
            .filter(
              (link) =>
                link.consumerId === item.id && relevant.has(link.providerId),
            )
            .map((link) => (
              <Typography key={link.id} variant="body2" sx={{ mt: 1 }}>
                {item.name} → {link.relation} → {name(link.providerId)} ·{" "}
                {link.required ? "Required" : "Optional"}
                <br />
                {link.description}
              </Typography>
            ))}
        </Paper>
      ))}
      <Typography variant="caption" color="text.secondary">
        These connections are declared by the team. They describe impact; each
        required claim still needs applicable verification.
      </Typography>
    </Stack>
  );
}
