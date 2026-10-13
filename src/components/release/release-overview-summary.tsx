"use client";

import { useTranslations } from "next-intl";

import { useEffect } from "react";
import { Stack, Typography } from "@mui/material";
import type { ReleaseOverview } from "@/lib/release-types";
import { ReadinessChip } from "./readiness-summary";
import { useServerClock } from "./use-server-clock";

export function ReleaseOverviewSummary({
  overview,
  showCandidate = false,
  compact = false,
}: {
  overview?: ReleaseOverview;
  showCandidate?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("Release");
  const { now, advance } = useServerClock(
    overview?.evaluatedAt ?? 0,
    overview?.state !== "ready",
  );
  const checkedNow = Math.max(now, overview?.evaluatedAt ?? 0);
  useEffect(() => {
    if (
      overview?.state !== "ready" ||
      overview.validUntil === null ||
      checkedNow >= overview.validUntil
    )
      return;
    const timer = setTimeout(
      advance,
      Math.max(1, Math.min(30_000, overview.validUntil - checkedNow + 1)),
    );
    return () => clearTimeout(timer);
  }, [overview?.state, overview?.validUntil, checkedNow, advance]);
  if (!overview) {
    return (
      <Typography color="text.secondary">{t("overview.unassessed")}</Typography>
    );
  }
  const expired =
    overview.state === "ready" &&
    overview.validUntil !== null &&
    checkedNow >= overview.validUntil;
  const currentReview =
    overview.decisionRevision === overview.assessment.revision && !expired;
  return (
    <Stack spacing={0.75} sx={{ mt: compact ? 0.75 : 2, mb: compact ? 0 : 2 }}>
      {showCandidate && (
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
          {t("overview.candidate", {
            candidate: overview.assessment.candidateLabel,
          })}
        </Typography>
      )}
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <ReadinessChip state={expired ? "needs_evidence" : overview.state} />
        <Typography variant="caption" color="text.secondary">
          {expired
            ? t("overview.expired")
            : t("readiness.counts", {
                blockers: overview.blockerCount,
                gaps: overview.gapCount,
              })}
        </Typography>
      </Stack>
      {!compact && (
        <Typography variant="caption" color="text.secondary">
          {t("overview.validation", {
            environment: overview.assessment.validationEnvironment,
            decision:
              overview.decision === null
                ? t("overview.noDecision")
                : currentReview
                  ? overview.decision === "approved"
                    ? t("overview.recordedApproved")
                    : t("overview.recordedHeld")
                  : overview.decision === "approved"
                    ? t("overview.earlierApproved")
                    : t("overview.earlierHeld"),
          })}
        </Typography>
      )}
    </Stack>
  );
}
