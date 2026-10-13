"use client";

import {
  MutationForm,
  type FormField,
} from "@/components/release/mutation-form";
import {
  CHECK_CATEGORIES,
  type ProductContext,
  type ReleaseCheck,
  type ReleaseDetail,
  type ReleaseMutation,
} from "@/lib/release-types";

export function CheckEditor({
  detail,
  product,
  check,
  onSave,
  onCancel,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  check: ReleaseCheck | null;
  onSave: (
    mutation: Omit<ReleaseMutation, "expectedRevision">,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const fields: FormField[] = [
    ...(!check
      ? [
          {
            name: "subject",
            label: "What this check verifies",
            required: true,
            type: "select" as const,
            options: [
              { value: "release|", label: "Entire release" },
              ...detail.scope
                .filter((item) => item.included)
                .map((item) => ({
                  value: `capability|${item.capabilityId}`,
                  label: `Capability · ${item.name}`,
                })),
              ...product.components
                .filter((item) => item.archivedAt === null)
                .map((item) => ({
                  value: `component|${item.id}`,
                  label: `Component · ${item.name}`,
                })),
            ],
          },
        ]
      : []),
    {
      name: "claim",
      label: "Acceptance claim",
      required: true,
      type: "textarea",
      helper:
        "A concrete assertion, e.g. Duplicate delivery creates one ledger entry.",
    },
    {
      name: "category",
      label: "Category",
      required: true,
      type: "select",
      options: CHECK_CATEGORIES.map((value) => ({ value, label: value })),
    },
    { name: "required", label: "Required to release", type: "checkbox" },
    { name: "ownerLabel", label: "Accountable owner", required: true },
    {
      name: "method",
      label: "How to verify",
      required: true,
      type: "textarea",
    },
    {
      name: "environment",
      label: "Verification environment",
      required: true,
      helper:
        "Evidence must match this environment and the assessment context.",
    },
    {
      name: "maxAgeHours",
      label: "Evidence remains current for (hours)",
      type: "number",
      required: true,
    },
  ];
  return (
    <MutationForm
      key={check?.id ?? "new"}
      fields={fields}
      initial={
        check
          ? {
              claim: check.claim,
              category: check.category,
              required: check.required,
              ownerLabel: check.ownerLabel,
              method: check.method,
              environment: check.environment,
              maxAgeHours: check.maxAgeMs / 3_600_000,
            }
          : {
              subject: "release|",
              category: "functional",
              required: true,
              ownerLabel: detail.assessment.ownerLabel,
              environment: detail.assessment.validationEnvironment,
              maxAgeHours: 24,
            }
      }
      submitLabel={check ? "Save new check revision" : "Add check"}
      onCancel={onCancel}
      onSubmit={async (values) => {
        const [subjectType, subjectId] = String(
          values.subject ?? `${check?.subjectType}|${check?.subjectId ?? ""}`,
        ).split("|");
        const { maxAgeHours, subject: _subject, ...data } = values;
        await onSave({
          type: check ? "check.revise" : "check.create",
          id: check?.id,
          data: {
            ...data,
            subjectType,
            subjectId: subjectId || null,
            maxAgeMs: Number(maxAgeHours) * 3_600_000,
          },
        });
        onCancel();
      }}
    />
  );
}
