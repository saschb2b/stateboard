"use client";

import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type { ReadinessState, ReleaseEvaluation } from "@/lib/release-types";

export const READINESS_LABELS: Record<ReadinessState, string> = {
  ready: "Ready",
  blocked: "Blocked",
  needs_evidence: "Needs evidence",
};
export function ReadinessChip({ state }: { state: ReadinessState }) {
  return (
    <Chip
      size="small"
      label={READINESS_LABELS[state]}
      color={
        state === "ready"
          ? "success"
          : state === "blocked"
            ? "error"
            : "warning"
      }
      variant="outlined"
    />
  );
}
export function ReadinessSummary({
  readiness,
}: {
  readiness: ReleaseEvaluation;
}) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            Current assessment
          </Typography>
          <Typography variant="h4">
            {READINESS_LABELS[readiness.state]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required checks and applicable evidence determine readiness. A
            person records the release decision.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <Typography variant="h5">{readiness.blockers.length}</Typography>
            <Typography variant="caption">Blockers</Typography>
          </Box>
          <Box>
            <Typography variant="h5">{readiness.gaps.length}</Typography>
            <Typography variant="caption">Evidence gaps</Typography>
          </Box>
        </Stack>
      </Stack>
      <Stack spacing={1} sx={{ mt: 2 }}>
        {readiness.blockers.map((reason, index) => (
          <Alert key={`blocker-${index}`} severity="error">
            {reason}
          </Alert>
        ))}
        {readiness.gaps.map((reason, index) => (
          <Alert key={`gap-${index}`} severity="warning">
            {reason}
          </Alert>
        ))}
        {readiness.warnings.map((reason, index) => (
          <Alert key={`warning-${index}`} severity="info">
            {reason}
          </Alert>
        ))}
        {readiness.state === "ready" && (
          <Alert severity="success">
            All required checks have current passing evidence for this
            assessment.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
