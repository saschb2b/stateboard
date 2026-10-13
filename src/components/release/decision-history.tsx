"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ReadinessChip } from "./readiness-summary";
import { EvidenceHistory } from "@/components/evidence/evidence-history";
import { ReleaseContext } from "./release-context";
import { SnapshotVisuals } from "./snapshot-visuals";
import { SnapshotDependencies } from "./snapshot-dependencies";
import type { ReleaseDecision, ReleaseDetail } from "@/lib/release-types";

export function DecisionHistory({
  detail,
  now,
  canPublish,
  onPublish,
}: {
  detail: ReleaseDetail;
  now: number;
  canPublish: boolean;
  onPublish: (decision: ReleaseDecision) => void;
}) {
  return (
    <Stack spacing={2}>
      {detail.decisions.map((decision) => (
        <Accordion key={decision.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Chip
                size="small"
                label={
                  decision.decision === "approved"
                    ? "Approved release"
                    : "Held release"
                }
                color={decision.decision === "approved" ? "success" : "warning"}
              />
              <ReadinessChip state={decision.snapshot.readiness.state} />
              <Typography variant="body2">
                Reviewed {new Date(decision.createdAt).toISOString()} ·{" "}
                {decision.actorName}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography>{decision.rationale}</Typography>
              <ReleaseContext assessment={decision.snapshot.assessment} />
              <Typography variant="body2" color="text.secondary">
                Recorded at assessment revision {decision.revision}. This review
                preserves its scope, checks, evidence, dependencies, and images.
              </Typography>
              {decision.revision < detail.assessment.revision && (
                <Alert severity="info">
                  The live assessment has changed since this review. This
                  decision remains a historical record.
                </Alert>
              )}
              {decision.expiresAt !== null && decision.expiresAt <= now && (
                <Alert severity="warning">
                  Evidence used in this decision has expired. Review the current
                  assessment before a new release decision.
                </Alert>
              )}
              {decision.expiresAt !== null && (
                <Typography variant="caption" color="text.secondary">
                  Recorded evidence freshness limit:{" "}
                  {new Date(decision.expiresAt).toISOString()}
                </Typography>
              )}
              {decision.snapshot.scope.map((item) => (
                <Stack key={item.capabilityId} spacing={0.5}>
                  <Typography variant="subtitle2">
                    {item.name} · {item.included ? "Included" : "Excluded"}
                  </Typography>
                  <Typography variant="body2">{item.outcome}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.scopeReason}
                  </Typography>
                </Stack>
              ))}
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
                      key={check.id}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2">
                        {check.claim} · {evaluation?.state ?? "Not evaluated"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {check.required ? "Required" : "Optional"} · Revision{" "}
                        {check.revision} · {check.category} · {check.ownerLabel}{" "}
                        · {check.environment}
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
                    </Box>
                  );
                })}
              <SnapshotDependencies snapshot={decision.snapshot} />
              <SnapshotVisuals snapshot={decision.snapshot} />
              {canPublish && (
                <Button variant="outlined" onClick={() => onPublish(decision)}>
                  Prepare public review link
                </Button>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
      {detail.decisions.length === 0 && (
        <Typography color="text.secondary">
          No release decision has been recorded yet.
        </Typography>
      )}
    </Stack>
  );
}
