"use client";

import { useRef } from "react";
import { Alert, Paper, Stack, Typography } from "@mui/material";
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
  const eventId = useRef<string | null>(null);
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2">
          {check.claim} · Revision {check.revision}
        </Typography>
        <Typography variant="body2">
          Candidate: {assessment.candidateRef}
          <br />
          Environment: {check.environment}
          <br />
          Audience: {assessment.audience}
          <br />
          Configuration: {assessment.configurationRef}
        </Typography>
      </Paper>
      <Alert severity="info">
        This review asserts the exact context above. Submitting a newer
        observation appends evidence; earlier observations remain in the
        history.
      </Alert>
      <MutationForm
        fields={[
          {
            name: "result",
            label: "Result",
            type: "select",
            required: true,
            options: [
              { value: "pass", label: "Pass" },
              { value: "fail", label: "Fail" },
              { value: "inconclusive", label: "Inconclusive" },
            ],
          },
          {
            name: "summary",
            label: "Observation",
            type: "textarea",
            required: true,
          },
          {
            name: "observedAt",
            label: "Observed at",
            type: "datetime-local",
            required: true,
            helper: "Date and time in your local timezone.",
          },
          { name: "source", label: "Evidence source", required: true },
          { name: "runRef", label: "Run or review reference", required: true },
          {
            name: "referenceUrl",
            label: "Supporting result link",
            helper:
              "Optional internal or external result URL. StateBoard does not fetch this link.",
          },
        ]}
        initial={{
          result: "inconclusive",
          observedAt: new Date(now - new Date(now).getTimezoneOffset() * 60_000)
            .toISOString()
            .slice(0, 16),
          source: "manual-review",
          runRef: "",
          referenceUrl: "",
        }}
        submitLabel="Append evidence"
        onCancel={onCancel}
        onSubmit={async (values) => {
          const observedAt = Date.parse(String(values.observedAt));
          if (!Number.isFinite(observedAt))
            throw new Error("Enter a valid observation date and time.");
          eventId.current ??= crypto.randomUUID();
          await onSave({
            type: "evidence.create",
            data: {
              ...values,
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
