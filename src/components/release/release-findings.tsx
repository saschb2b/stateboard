"use client";

import { useState } from "react";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import type {
  ReleaseCheck,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";

/** Display evaluated claims; this list never recalculates readiness. */
export function ReleaseFindings({
  detail,
  readiness,
  onInspectCheck,
  onReviewChecks,
  editable = false,
  includePassing = false,
  subjectTypes,
  title = "Required verification actions",
  initialLimit,
}: {
  detail: ReleaseDetail;
  readiness: ReleaseEvaluation;
  onInspectCheck?: (checkId: string) => void;
  onReviewChecks?: () => void;
  editable?: boolean;
  includePassing?: boolean;
  subjectTypes?: ReleaseCheck["subjectType"][];
  title?: string;
  initialLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const findings = readiness.checks.flatMap((evaluation) => {
    const check = detail.checks.find((item) => item.id === evaluation.checkId);
    return check &&
      evaluation.required &&
      (includePassing || evaluation.state !== "pass") &&
      (!subjectTypes || subjectTypes.includes(check.subjectType))
      ? [{ check, evaluation }]
      : [];
  });
  const definitionGaps = subjectTypes
    ? []
    : readiness.capabilities.filter((capability) =>
        capability.reasons.includes(
          `${capability.name} needs a required functional acceptance check.`,
        ),
      );
  if (findings.length === 0 && definitionGaps.length === 0) return null;
  const total = findings.length + definitionGaps.length;
  const canCollapse = initialLimit !== undefined && total > initialLimit;
  const visibleCount =
    canCollapse && !expanded ? (initialLimit ?? total) : total;
  return (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={0.5}
      >
        <Typography variant="h6">{title}</Typography>
        {initialLimit !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {total} required findings · Showing {visibleCount}
          </Typography>
        )}
      </Stack>
      {findings.slice(0, visibleCount).map(({ check, evaluation }) => {
        const subject =
          check.subjectType === "release"
            ? "Entire release"
            : check.subjectType === "component"
              ? "Component check"
              : (detail.scope.find(
                  (item) => item.capabilityId === check.subjectId,
                )?.name ?? "Capability check");
        const noObservations = !detail.evidence.some(
          (item) => item.checkId === check.id,
        );
        return (
          <Alert
            key={check.id}
            icon={false}
            severity={
              evaluation.state === "fail"
                ? "error"
                : evaluation.state === "pass"
                  ? "success"
                  : "warning"
            }
          >
            <Stack spacing={0.5}>
              <Stack
                direction="row"
                gap={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography variant="subtitle2">{check.claim}</Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={evaluation.state}
                />
              </Stack>
              <Typography variant="caption">
                {subject} · Required · {check.ownerLabel} · Check revision{" "}
                {check.revision}
              </Typography>
              <Typography variant="body2">
                Expected environment: {check.environment}
              </Typography>
              <Typography variant="body2">
                Next verification: {check.method}
              </Typography>
              <Typography variant="body2">
                {evaluation.state === "missing" && noObservations
                  ? "No observation recorded for this check."
                  : evaluation.reason}
              </Typography>
              {onInspectCheck && (
                <Button
                  size="small"
                  sx={{ alignSelf: "flex-start" }}
                  aria-label={`Inspect check: ${check.claim}`}
                  onClick={() => onInspectCheck(check.id)}
                >
                  {editable ? "Inspect / record evidence" : "Inspect check"}
                </Button>
              )}
            </Stack>
          </Alert>
        );
      })}
      {definitionGaps
        .slice(0, Math.max(0, visibleCount - findings.length))
        .map((capability) => (
          <Alert key={capability.capabilityId} severity="warning" icon={false}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">
                {capability.name} needs a required functional acceptance check.
              </Typography>
              <Typography variant="body2">
                Owner:{" "}
                {
                  detail.scope.find(
                    (item) => item.capabilityId === capability.capabilityId,
                  )?.ownerLabel
                }
              </Typography>
              <Typography variant="body2">
                Next action: define the acceptance check, then verify it in{" "}
                {detail.assessment.validationEnvironment}.
              </Typography>
              {onReviewChecks && (
                <Button
                  size="small"
                  sx={{ alignSelf: "flex-start" }}
                  onClick={onReviewChecks}
                >
                  Review acceptance checks
                </Button>
              )}
            </Stack>
          </Alert>
        ))}
      {canCollapse && (
        <Button
          size="small"
          sx={{ alignSelf: "flex-start" }}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `Show all ${total} findings`}
        </Button>
      )}
    </Stack>
  );
}
