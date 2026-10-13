"use client";

import { Box, Stack, Typography } from "@mui/material";
import { ReadinessChip } from "./readiness-summary";
import { EvidenceHistory } from "@/components/evidence/evidence-history";
import { ReleaseContext } from "./release-context";
import { SnapshotVisuals } from "./snapshot-visuals";
import { SnapshotDependencies } from "./snapshot-dependencies";
import type { ReleaseDecision } from "@/lib/release-types";

/** All details come from the recorded snapshot, never the live assessment. */
export function DecisionSnapshotDetails({
  decision,
}: {
  decision: ReleaseDecision;
}) {
  return (
    <Box component="details">
      <Typography
        component="summary"
        variant="body2"
        sx={{ cursor: "pointer", width: "fit-content" }}
      >
        Reviewed scope and evidence
      </Typography>
      <Stack spacing={3} sx={{ pt: 2 }}>
        <ReleaseContext assessment={decision.snapshot.assessment} />
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Checks when reviewed
          </Typography>
          <ReadinessChip state={decision.snapshot.readiness.state} />
        </Stack>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Capabilities</Typography>
          {decision.snapshot.scope.map((item) => (
            <Box
              key={item.capabilityId}
              sx={{
                pb: 1.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {item.name} · {item.included ? "Included" : "Excluded"}
              </Typography>
              <Typography variant="body2">{item.outcome}</Typography>
              <Typography variant="caption" color="text.secondary">
                {item.scopeReason}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Checks
          </Typography>
          {decision.snapshot.checks
            .filter((check) => check.archivedAt === null)
            .map((check) => {
              const evaluation = decision.snapshot.readiness.checks.find(
                (item) => item.checkId === check.id,
              );
              const evidence = decision.snapshot.evidence.find(
                (item) => item.id === evaluation?.evidenceId,
              );
              return (
                <Box
                  component="details"
                  key={check.id}
                  sx={{
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    component="summary"
                    variant="body2"
                    sx={{ cursor: "pointer" }}
                  >
                    {check.claim} · {evaluation?.state ?? "Not evaluated"}
                  </Typography>
                  <Stack spacing={1} sx={{ pt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {check.required ? "Required" : "Optional"} · Revision{" "}
                      {check.revision} · {check.category} · {check.ownerLabel} ·{" "}
                      {check.environment}
                    </Typography>
                    <Typography variant="body2">{check.method}</Typography>
                    <Typography variant="body2">
                      {evaluation?.reason}
                    </Typography>
                    {evidence && (
                      <Typography variant="caption" color="text.secondary">
                        {evidence.summary} · {evidence.actorName} ·{" "}
                        {new Date(evidence.observedAt).toISOString()}
                      </Typography>
                    )}
                    <EvidenceHistory
                      detail={{
                        assessment: decision.snapshot.assessment,
                        scope: decision.snapshot.scope,
                        checks: decision.snapshot.checks,
                        evidence: decision.snapshot.evidence,
                        assets: decision.snapshot.assets,
                        decisions: [],
                        shares: [],
                      }}
                      check={check}
                      evaluation={evaluation}
                      now={decision.createdAt}
                    />
                  </Stack>
                </Box>
              );
            })}
        </Box>
        <SnapshotDependencies snapshot={decision.snapshot} />
        <SnapshotVisuals snapshot={decision.snapshot} />
      </Stack>
    </Box>
  );
}
