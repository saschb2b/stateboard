"use client";

import { useTranslations, useFormatter } from "next-intl";

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
  const t = useTranslations("Release");
  const format = useFormatter();
  const entries = detail.evidence
    .filter((item) => item.checkId === check.id)
    .sort((a, b) => b.sequence - a.sequence);
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2">
          {t("evidence.history", { count: entries.length })}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {entries.map((item) => {
            const mismatch = [
              item.checkRevision !== check.revision
                ? t("evidence.earlierRevision")
                : "",
              item.candidateRef !== detail.assessment.candidateRef
                ? t("evidence.differentCandidate")
                : "",
              item.environment !== check.environment
                ? t("evidence.differentEnvironment")
                : "",
              item.audience !== detail.assessment.audience
                ? t("evidence.differentAudience")
                : "",
              item.configurationRef !== detail.assessment.configurationRef
                ? t("evidence.differentConfiguration")
                : "",
              item.observedAt > now ? t("evidence.future") : "",
              now - item.observedAt >= check.maxAgeMs
                ? t("evidence.stale")
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
                    label={t(`results.${item.result}`)}
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
                    <Chip size="small" label={t("evidence.current")} />
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
                  {t("evidence.times", {
                    observed:
                      format.dateTime(item.observedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      }) + " UTC",
                    received:
                      format.dateTime(item.receivedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      }) + " UTC",
                  })}
                  <br />
                  {t("evidence.checkRevision", {
                    revision: item.checkRevision,
                    candidate: item.candidateRef,
                  })}
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
                    {t("evidence.openResult")}
                  </Typography>
                )}
              </Stack>
            );
          })}
          {entries.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t("evidence.empty")}
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
