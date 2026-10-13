"use client";

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
    return <Typography color="text.secondary">Not assessed yet</Typography>;
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
          Latest candidate · {overview.assessment.candidateLabel}
        </Typography>
      )}
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <ReadinessChip state={expired ? "needs_evidence" : overview.state} />
        <Typography variant="caption" color="text.secondary">
          {expired
            ? "Evidence expired; open the assessment to recheck."
            : `${overview.blockerCount} blockers · ${overview.gapCount} evidence gaps`}
        </Typography>
      </Stack>
      {!compact && (
        <Typography variant="caption" color="text.secondary">
          Validation: {overview.assessment.validationEnvironment} ·{" "}
          {overview.decision === null
            ? "No recorded decision"
            : `${currentReview ? "Recorded" : "Earlier"} ${overview.decision} review`}
        </Typography>
      )}
    </Stack>
  );
}
