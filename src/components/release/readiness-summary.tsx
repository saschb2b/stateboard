"use client";

import { useTranslations } from "next-intl";

import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type {
  ReadinessState,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";
import { useReleaseReason } from "./use-release-reason";
import { ReleaseFindings } from "./release-findings";

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
  const t = useTranslations("Release");
  return (
    <Chip
      size="small"
      label={
        verification
          ? t("readiness.verification", { state: t(`readiness.${state}`) })
          : t(`readiness.${state}`)
      }
      color={READINESS_COLORS[state]}
      variant="outlined"
      sx={{
        height: "auto",
        minHeight: 23,
        maxWidth: "100%",
        justifyContent: "flex-start",
        fontWeight: 500,
        border: 0,
        "& .MuiChip-label": {
          px: 0,
          whiteSpace: "normal",
          overflow: "visible",
          textOverflow: "clip",
          lineHeight: 1.4,
          textAlign: "left",
        },
        "&::before": {
          content: '""',
          width: 6,
          height: 6,
          flexShrink: 0,
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
  const t = useTranslations("Release");
  const approved = detail.decisions.some(
    (decision) =>
      decision.decision === "approved" &&
      decision.revision === detail.assessment.revision &&
      (decision.expiresAt === null || decision.expiresAt > now),
  );
  return (
    <Typography variant="body2" color="text.secondary">
      {t("readiness.context", {
        validation: detail.assessment.validationEnvironment,
        target: detail.assessment.targetEnvironment,
        decision: approved
          ? t("readiness.approvedCurrent")
          : t("readiness.notApprovedCurrent"),
      })}
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
  onReviewChecks?: (capabilityId?: string) => void;
  onReviewDecision?: () => void;
  editable?: boolean;
}) {
  const t = useTranslations("Release");
  const localizeReason = useReleaseReason();
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
            {t(`readiness.${readiness.state}`)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {readiness.state === "ready"
              ? currentDecision
                ? t("readiness.passing")
                : t("readiness.awaitDecision")
              : t("readiness.counts", {
                  blockers: readiness.blockers.length,
                  gaps: readiness.gaps.length,
                })}
          </Typography>
          {detail && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}
            >
              {t("readiness.validation", {
                environment: detail.assessment.validationEnvironment,
              })}
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
                ? t("readiness.held")
                : t("readiness.approved")
              : t("readiness.review")}
          </Button>
        )}
      </Stack>
      {detail && !detail.scope.some((capability) => capability.included) && (
        <Typography variant="body2" color="text.secondary">
          {t("readiness.empty")}
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
            {detail
              ? t("readiness.optionalWarnings")
              : t("readiness.allFindings")}
            {readiness.warnings.length > 0
              ? detail
                ? ` · ${readiness.warnings.length}`
                : t("readiness.warningsCount", {
                    count: readiness.warnings.length,
                  })
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
                  {localizeReason(reason)}
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
                  {localizeReason(reason)}
                </Typography>
              ))}
            {readiness.warnings.map((reason, index) => (
              <Typography
                component="li"
                variant="body2"
                color="text.secondary"
                key={`warning-${index}`}
              >
                {localizeReason(reason)}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
