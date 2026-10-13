"use client";

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
  const fields: FormField[] = [
    {
      name: "candidateLabel",
      label: "Candidate name",
      required: true,
      helper: "e.g. October release · RC 3",
    },
    {
      name: "candidateRef",
      label: "Immutable candidate reference",
      required: true,
      helper:
        "Commit SHA, image digest, or immutable artifact manifest reference.",
    },
    {
      name: "validationEnvironment",
      label: "Validation environment",
      required: true,
      helper: "Where the required checks run.",
    },
    {
      name: "targetEnvironment",
      label: "Target deployment environment",
      required: true,
    },
    { name: "audience", label: "Intended audience", required: true },
    {
      name: "configurationRef",
      label: "Configuration reference",
      required: true,
      helper: "Versioned configuration and feature flag set.",
    },
    { name: "ownerLabel", label: "Accountable release owner", required: true },
    {
      name: "capabilityIds",
      label: "Capabilities in the assessment",
      type: "multi",
      required: true,
      helper:
        "Context is fixed when created. Scope and checks remain explicit and versioned.",
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
      submitLabel="Create assessment"
      onSubmit={(data) => onSubmit(data as unknown as CreateAssessmentInput)}
    />
  );
}
