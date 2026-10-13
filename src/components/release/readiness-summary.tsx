"use client";

import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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
      sx={{
        height: 23,
        fontWeight: 500,
        border: 0,
        "& .MuiChip-label": { px: 0 },
        "&::before": {
          content: '""',
          width: 6,
          height: 6,
          mr: 0.75,
          borderRadius: "50%",
          bgcolor: "currentColor",
        },
      }}
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
  onReviewDecision,
  editable = false,
}: {
  readiness: ReleaseEvaluation;
  detail?: ReleaseDetail;
  onInspectCheck?: (checkId: string) => void;
  onReviewChecks?: () => void;
  onReviewDecision?: () => void;
  editable?: boolean;
}) {
  const currentDecision = detail?.decisions.find(
    (decision) =>
      decision.revision === detail.assessment.revision &&
      (decision.expiresAt === null ||
        decision.expiresAt > readiness.evaluatedAt),
  );
  return (
    <Stack spacing={2.5}>
      <Stack
        direction="column"
        gap={1}
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Stack spacing={0.5}>
          <Typography variant="h6" component="h2">
            {READINESS_LABELS[readiness.state]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {readiness.state === "ready"
              ? currentDecision
                ? "Required checks pass."
                : "Required checks pass. Ready for the release owner's decision."
              : `${readiness.blockers.length} blockers · ${readiness.gaps.length} evidence gaps`}
          </Typography>
        </Stack>
        {detail && (
          <Typography variant="caption" color="text.secondary">
            Validation · {detail.assessment.validationEnvironment}
          </Typography>
        )}
        {onReviewDecision && (
          <Button
            color="inherit"
            size="small"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            sx={{ p: 0, mt: 0.5 }}
            onClick={onReviewDecision}
          >
            {currentDecision
              ? currentDecision.decision === "held"
                ? "Decision held"
                : "Decision approved"
              : "Review decision"}
          </Button>
        )}
      </Stack>
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
      {(readiness.blockers.length > 0 ||
        readiness.gaps.length > 0 ||
        readiness.warnings.length > 0) && (
        <Box component="details">
          <Typography
            component="summary"
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer", width: "fit-content" }}
          >
            All findings
            {readiness.warnings.length > 0
              ? ` · ${readiness.warnings.length} optional warnings`
              : ""}
          </Typography>
          <Stack component="ul" spacing={1} sx={{ mt: 1, pl: 2.5 }}>
            {readiness.blockers.map((reason, index) => (
              <Typography
                component="li"
                variant="body2"
                key={`blocker-${index}`}
                sx={{ "&::marker": { color: "error.main" } }}
              >
                {reason}
              </Typography>
            ))}
            {readiness.gaps.map((reason, index) => (
              <Typography
                component="li"
                variant="body2"
                key={`gap-${index}`}
                sx={{ "&::marker": { color: "warning.main" } }}
              >
                {reason}
              </Typography>
            ))}
            {readiness.warnings.map((reason, index) => (
              <Typography
                component="li"
                variant="body2"
                color="text.secondary"
                key={`warning-${index}`}
              >
                {reason}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
