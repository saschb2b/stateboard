"use client";

import { useId, useState } from "react";
import { CHECK_RESULT_LABELS } from "@/components/evidence/check-result-labels";
import { Box, Button, ButtonBase, Stack, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
  includePassing = false,
  subjectTypes,
  title = "Needs attention",
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
  const findingsId = useId();
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
        <Typography variant="subtitle2">{title}</Typography>
        {canCollapse && (
          <Typography variant="caption" color="text.secondary">
            {visibleCount} of {total}
          </Typography>
        )}
      </Stack>
      {findings.slice(0, visibleCount).map(({ check, evaluation }) => {
        return (
          <ButtonBase
            key={check.id}
            component={onInspectCheck ? "button" : "div"}
            role={onInspectCheck ? undefined : "group"}
            tabIndex={onInspectCheck ? 0 : -1}
            onClick={
              onInspectCheck ? () => onInspectCheck(check.id) : undefined
            }
            aria-describedby={
              onInspectCheck ? `${findingsId}-${check.id}` : undefined
            }
            aria-label={
              onInspectCheck ? `Inspect check: ${check.claim}` : undefined
            }
            sx={{
              width: "100%",
              justifyContent: "space-between",
              textAlign: "left",
              py: 1.5,
              gap: 2,
              borderBottom: 1,
              borderColor: "divider",
              "&:hover": onInspectCheck ? { bgcolor: "action.hover" } : {},
              "&.Mui-focusVisible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500}>
                {check.claim}
              </Typography>
              <Typography
                id={`${findingsId}-${check.id}`}
                variant="caption"
                color="text.secondary"
              >
                <Box
                  component="span"
                  sx={{
                    color:
                      evaluation.state === "fail"
                        ? "error.main"
                        : evaluation.state === "pass"
                          ? "success.main"
                          : "warning.main",
                  }}
                >
                  {CHECK_RESULT_LABELS[evaluation.state]}
                </Box>
                {" · "}
                {check.ownerLabel}
              </Typography>
            </Stack>
            {onInspectCheck && (
              <ChevronRightIcon
                fontSize="small"
                sx={{ color: "text.secondary", flexShrink: 0 }}
              />
            )}
          </ButtonBase>
        );
      })}
      {definitionGaps
        .slice(0, Math.max(0, visibleCount - findings.length))
        .map((capability) => (
          <Box
            key={capability.capabilityId}
            sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
          >
            <Typography variant="body2">
              {capability.name} needs a required functional acceptance check.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {
                detail.scope.find(
                  (item) => item.capabilityId === capability.capabilityId,
                )?.ownerLabel
              }
            </Typography>
            {onReviewChecks && (
              <Button
                size="small"
                onClick={onReviewChecks}
                sx={{ display: "block", mt: 0.5 }}
              >
                Review acceptance checks
              </Button>
            )}
          </Box>
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
