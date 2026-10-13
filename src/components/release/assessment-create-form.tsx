"use client";

import { useTranslations } from "next-intl";

import { MutationForm, type FormField } from "./mutation-form";
import type { Capability, CreateAssessmentInput } from "@/lib/release-types";

export function AssessmentCreateForm({
  capabilities,
  ownerLabel,
  onSubmit,
}: {
  capabilities: Capability[];
  ownerLabel: string;
  onSubmit: (data: CreateAssessmentInput) => Promise<void>;
}) {
  const t = useTranslations("Release");
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
  return (
    <MutationForm
      fields={fields}
      initial={{
        ownerLabel,
        capabilityIds: capabilities
          .filter((item) => item.archivedAt === null)
          .map((item) => item.id),
      }}
      submitLabel={t("create.submit")}
      onSubmit={(data) => onSubmit(data as unknown as CreateAssessmentInput)}
    />
  );
}
