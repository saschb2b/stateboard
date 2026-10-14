"use client";

import { useTranslations } from "next-intl";

import { useRef } from "react";
import { Paper, Stack, Typography } from "@mui/material";
import { MutationForm } from "@/components/release/mutation-form";
import type {
  ReleaseAssessment,
  ReleaseCheck,
  ReleaseMutation,
} from "@/lib/release-types";

export function EvidenceForm({
  assessment,
  check,
  now,
  onSave,
  onCancel,
}: {
  assessment: ReleaseAssessment;
  check: ReleaseCheck;
  now: number;
  onSave: (
    mutation: Omit<ReleaseMutation, "expectedRevision">,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("Release");
  const eventId = useRef<string | null>(null);
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, overflowWrap: "anywhere" }}>
        <Typography variant="subtitle2">
          {t("evidence.claimRevision", {
            claim: check.claim,
            revision: check.revision,
          })}
        </Typography>
        <Typography variant="body2">
          {t("evidence.owner", { owner: check.ownerLabel })}
        </Typography>
        <Typography variant="body2">
          {t("evidence.method", { method: check.method })}
        </Typography>
        <Typography variant="body2">
          {t("evidence.candidate", { value: assessment.candidateRef })}
          <br />
          {t("evidence.environment", { value: check.environment })}
          <br />
          {t("evidence.audience", { value: assessment.audience })}
          <br />
          {t("evidence.configuration", { value: assessment.configurationRef })}
        </Typography>
      </Paper>
      <Typography variant="body2" color="text.secondary">
        {t("evidence.contextHelp")}
      </Typography>
      <MutationForm
        fields={[
          {
            name: "result",
            label: t("common.result"),
            type: "select",
            required: true,
            options: [
              { value: "pass", label: t("evidence.pass") },
              { value: "fail", label: t("evidence.fail") },
              { value: "inconclusive", label: t("evidence.inconclusive") },
            ],
          },
          {
            name: "summary",
            label: t("evidence.observation"),
            helper: t("evidence.observationHelp"),
            type: "textarea",
            required: true,
          },
          {
            name: "referenceUrl",
            label: t("evidence.supportingLink"),
            helper: t("evidence.linkHelp"),
          },
        ]}
        details={{
          label: t("evidence.sourceDetails"),
          summary: (values) => {
            const source =
              values.source === "manual-review"
                ? t("evidence.manualSource")
                : String(values.source);
            return values.runRef
              ? t("evidence.sourceReferenceSummary", {
                  source,
                  reference: String(values.runRef),
                })
              : t("evidence.sourceSummary", { source });
          },
          fields: [
            {
              name: "observedAt",
              label: t("evidence.observedAt"),
              type: "datetime-local",
              required: true,
              helper: t("evidence.localTime"),
            },
            { name: "source", label: t("evidence.source"), required: true },
            {
              name: "runRef",
              label: t("evidence.runReference"),
              helper: t("evidence.referenceHelp"),
            },
          ],
        }}
        initial={{
          result: "inconclusive",
          observedAt: new Date(now - new Date(now).getTimezoneOffset() * 60_000)
            .toISOString()
            .slice(0, 16),
          source: "manual-review",
          runRef: "",
          referenceUrl: "",
        }}
        submitLabel={t("evidence.append")}
        onCancel={onCancel}
        onSubmit={async (values) => {
          const observedAt = Date.parse(String(values.observedAt));
          if (!Number.isFinite(observedAt))
            throw new Error(t("evidence.invalidTime"));
          eventId.current ??= crypto.randomUUID();
          await onSave({
            type: "evidence.create",
            data: {
              ...values,
              runRef:
                String(values.runRef).trim() ||
                `manual-review:${eventId.current}`,
              observedAt,
              checkId: check.id,
              checkRevision: check.revision,
              candidateRef: assessment.candidateRef,
              environment: check.environment,
              audience: assessment.audience,
              configurationRef: assessment.configurationRef,
              referenceUrl: values.referenceUrl || null,
              eventId: eventId.current,
            },
          });
          onCancel();
        }}
      />
    </Stack>
  );
}
