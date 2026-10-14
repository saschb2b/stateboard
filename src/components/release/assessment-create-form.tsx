"use client";

import { useTranslations } from "next-intl";

import { Stack, Typography } from "@mui/material";
import { MutationForm, type FormField } from "./mutation-form";
import type {
  Capability,
  CreateAssessmentInput,
  ReleaseAssessment,
} from "@/lib/release-types";

export function AssessmentCreateForm({
  capabilities,
  ownerLabel,
  previous,
  onSubmit,
  onCancel,
}: {
  capabilities: Capability[];
  ownerLabel: string;
  previous?: ReleaseAssessment;
  onSubmit: (data: CreateAssessmentInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useTranslations("Release");
  const productT = useTranslations("Product");
  const fields: FormField[] = [
    {
      name: "candidateLabel",
      label: t("create.candidateName"),
      required: true,
      helper: t("create.candidateExample"),
    },
    {
      name: "candidateRef",
      label: t("create.candidateReference"),
      required: true,
      helper: t("create.candidateHelp"),
    },
    {
      name: "validationEnvironment",
      label: t("create.validationEnvironment"),
      required: true,
      helper: t("create.validationHelp"),
    },
    {
      name: "targetEnvironment",
      label: t("create.targetEnvironment"),
      required: true,
    },
    { name: "audience", label: t("create.audience"), required: true },
    {
      name: "configurationRef",
      label: t("create.configuration"),
      required: true,
      helper: t("create.configurationHelp"),
    },
    { name: "ownerLabel", label: t("create.owner"), required: true },
    {
      name: "capabilityIds",
      label: t("create.capabilities"),
      type: "multi",
      required: true,
      helper: t("create.contextHelp"),
      options: capabilities
        .filter((item) => item.archivedAt === null)
        .map((item) => ({ value: item.id, label: item.name })),
    },
  ];
  const contextFields = fields.filter(
    (field) =>
      !["candidateLabel", "candidateRef", "capabilityIds"].includes(field.name),
  );
  const candidateFields = fields.filter((field) =>
    ["candidateLabel", "candidateRef", "capabilityIds"].includes(field.name),
  );
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {productT("reviewSetupHelp")}
      </Typography>
      {previous && (
        <Typography variant="body2" color="text.secondary">
          {productT("reuseContext", { name: previous.candidateLabel })}
        </Typography>
      )}
      <MutationForm
        fields={previous ? candidateFields : fields}
        details={
          previous
            ? {
                label: productT("reviewContext"),
                fields: contextFields,
                summary: (values) =>
                  productT("contextSummary", {
                    validation: String(values.validationEnvironment),
                    target: String(values.targetEnvironment),
                    audience: String(values.audience),
                    configuration: String(values.configurationRef),
                  }),
              }
            : undefined
        }
        initial={{
          ownerLabel,
          ...(previous
            ? {
                validationEnvironment: previous.validationEnvironment,
                targetEnvironment: previous.targetEnvironment,
                audience: previous.audience,
                configurationRef: previous.configurationRef,
              }
            : {}),
          capabilityIds: capabilities
            .filter((item) => item.archivedAt === null)
            .map((item) => item.id),
        }}
        submitLabel={t("create.submit")}
        onCancel={onCancel}
        onSubmit={(data) =>
          onSubmit({
            candidateLabel: String(data.candidateLabel),
            candidateRef: String(data.candidateRef),
            validationEnvironment: String(data.validationEnvironment),
            targetEnvironment: String(data.targetEnvironment),
            audience: String(data.audience),
            configurationRef: String(data.configurationRef),
            ownerLabel: String(data.ownerLabel),
            capabilityIds: Array.isArray(data.capabilityIds)
              ? data.capabilityIds
              : [],
          })
        }
      />
    </Stack>
  );
}
