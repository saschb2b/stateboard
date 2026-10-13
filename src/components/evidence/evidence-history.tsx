"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type {
  CheckEvaluation,
  ReleaseCheck,
  ReleaseDetail,
} from "@/lib/release-types";

export function EvidenceHistory({
  detail,
  check,
  evaluation,
  now,
}: {
  detail: ReleaseDetail;
  check: ReleaseCheck;
  evaluation?: CheckEvaluation;
  now: number;
}) {
  const entries = detail.evidence
    .filter((item) => item.checkId === check.id)
    .sort((a, b) => b.sequence - a.sequence);
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2">
          Evidence history · {entries.length} observations
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {entries.map((item) => {
            const mismatch = [
              item.checkRevision !== check.revision
                ? "Earlier check revision"
                : "",
              item.candidateRef !== detail.assessment.candidateRef
                ? "Different candidate"
                : "",
              item.environment !== check.environment
                ? "Different environment"
                : "",
              item.audience !== detail.assessment.audience
                ? "Different audience"
                : "",
              item.configurationRef !== detail.assessment.configurationRef
                ? "Different configuration"
                : "",
              item.observedAt > now ? "Future observation" : "",
              now - item.observedAt >= check.maxAgeMs
                ? "Stale observation"
                : "",
            ].filter(Boolean);
            return (
              <Stack
                key={item.id}
                spacing={0.5}
                sx={{ pb: 2, borderBottom: 1, borderColor: "divider" }}
              >
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Chip
                    label={item.result}
                    size="small"
                    color={
                      item.result === "pass"
                        ? "success"
                        : item.result === "fail"
                          ? "error"
                          : "warning"
                    }
                  />
                  {evaluation?.evidenceId === item.id && (
                    <Chip size="small" label="Used in current assessment" />
                  )}
                  {mismatch.map((reason) => (
                    <Chip
                      key={reason}
                      size="small"
                      variant="outlined"
                      label={reason}
                    />
                  ))}
                </Stack>
                <Typography variant="body2">{item.summary}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.actorName} · {item.source} · {item.runRef}
                  <br />
                  Observed {new Date(item.observedAt).toISOString()} · Received{" "}
                  {new Date(item.receivedAt).toISOString()}
                  <br />
                  Check revision {item.checkRevision} · {item.candidateRef}
                  <br />
                  {item.environment} · {item.audience} · {item.configurationRef}
                </Typography>
                {item.referenceUrl && (
                  <Typography
                    component="a"
                    href={item.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    color="primary"
                  >
                    Open supporting result
                  </Typography>
                )}
              </Stack>
            );
          })}
          {entries.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No evidence has been recorded for this check.
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
