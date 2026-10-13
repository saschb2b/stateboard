"use client";

import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type {
  ReadinessState,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";
import { ReleaseFindings } from "./release-findings";

export const READINESS_LABELS: Record<ReadinessState, string> = {
  ready: "Ready",
  blocked: "Blocked",
  needs_evidence: "Needs evidence",
};
export function ReadinessChip({
  state,
  verification = false,
}: {
  state: ReadinessState;
  verification?: boolean;
}) {
  return (
    <Chip
      size="small"
      label={`${READINESS_LABELS[state]}${verification ? " · checks" : ""}`}
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
export function VerificationContext({
  detail,
  now,
}: {
  detail: ReleaseDetail;
  now: number;
}) {
  const approved = detail.decisions.some(
    (decision) =>
      decision.decision === "approved" &&
      decision.revision === detail.assessment.revision &&
      (decision.expiresAt === null || decision.expiresAt > now),
  );
  return (
    <Typography variant="body2" color="text.secondary">
      Verification: {detail.assessment.validationEnvironment} · Deployment
      target: {detail.assessment.targetEnvironment} ·{" "}
      {approved
        ? "Approved decision recorded for this revision."
        : "No current approved decision for this revision."}
    </Typography>
  );
}
export function ReadinessSummary({
  readiness,
  detail,
  onInspectCheck,
  onReviewChecks,
  editable = false,
}: {
  readiness: ReleaseEvaluation;
  detail?: ReleaseDetail;
  onInspectCheck?: (checkId: string) => void;
  onReviewChecks?: () => void;
  editable?: boolean;
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
            {readiness.state === "ready"
              ? "Required checks have current passing evidence. A release owner records approval."
              : readiness.state === "blocked"
                ? "This assessment cannot be approved yet. A required check failed."
                : "This assessment cannot be approved yet. Required claims still need current evidence."}
          </Typography>
          {detail && (
            <VerificationContext detail={detail} now={readiness.evaluatedAt} />
          )}
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
        {detail && (
          <ReleaseFindings
            detail={detail}
            readiness={readiness}
            onInspectCheck={onInspectCheck}
            onReviewChecks={onReviewChecks}
            editable={editable}
            initialLimit={3}
          />
        )}
        <Box component={detail ? "details" : "div"}>
          {detail && (
            <Typography
              component="summary"
              variant="body2"
              sx={{ cursor: "pointer" }}
            >
              Full assessment findings · {readiness.blockers.length} blockers ·{" "}
              {readiness.gaps.length} evidence gaps
              {readiness.warnings.length > 0 &&
                ` · ${readiness.warnings.length} optional warnings`}
            </Typography>
          )}
          <Stack spacing={1} sx={detail ? { mt: 1 } : undefined}>
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
        </Box>
      </Stack>
    </Paper>
  );
}
