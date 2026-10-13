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
const READINESS_COLORS = {
  ready: "success",
  blocked: "error",
  needs_evidence: "warning",
} as const;
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
      color={READINESS_COLORS[state]}
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
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ py: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Stack spacing={1}>
          <Typography
            variant="h6"
            component="h2"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              "&::before": {
                content: '""',
                width: 8,
                height: 8,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: `${READINESS_COLORS[readiness.state]}.main`,
              },
            }}
          >
            {READINESS_LABELS[readiness.state]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {readiness.state === "ready"
              ? currentDecision
                ? "Required checks pass."
                : "Required checks pass. Ready for the release owner's decision."
              : `${readiness.blockers.length} blocker${readiness.blockers.length === 1 ? "" : "s"} · ${readiness.gaps.length} evidence gap${readiness.gaps.length === 1 ? "" : "s"}`}
          </Typography>
          {detail && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}
            >
              Validation · {detail.assessment.validationEnvironment}
            </Typography>
          )}
        </Stack>
        {onReviewDecision && (
          <Button
            color="inherit"
            size="small"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            sx={{ px: 0, minHeight: 32 }}
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
      {detail && !detail.scope.some((capability) => capability.included) && (
        <Typography variant="body2" color="text.secondary">
          No capabilities included. Add the outcomes this candidate must
          support.
        </Typography>
      )}
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
      {((!detail &&
        (readiness.blockers.length > 0 || readiness.gaps.length > 0)) ||
        readiness.warnings.length > 0) && (
        <Box component="details">
          <Typography
            component="summary"
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer", width: "fit-content" }}
          >
            {detail ? "Optional warnings" : "All findings"}
            {readiness.warnings.length > 0
              ? detail
                ? ` · ${readiness.warnings.length}`
                : ` · ${readiness.warnings.length} optional warnings`
              : ""}
          </Typography>
          <Stack component="ul" spacing={1} sx={{ mt: 1, pl: 2.5 }}>
            {!detail &&
              readiness.blockers.map((reason, index) => (
                <Typography
                  component="li"
                  variant="body2"
                  key={`blocker-${index}`}
                  sx={{ "&::marker": { color: "error.main" } }}
                >
                  {reason}
                </Typography>
              ))}
            {!detail &&
              readiness.gaps.map((reason, index) => (
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
