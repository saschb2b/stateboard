"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("Release");
  const fields: FormField[] = [
    ...(!check
      ? [
          {
            name: "subject",
            label: t("check.subject"),
            required: true,
            type: "select" as const,
            options: [
              { value: "release|", label: t("common.entireRelease") },
              ...detail.scope
                .filter((item) => item.included)
                .map((item) => ({
                  value: `capability|${item.capabilityId}`,
                  label: t("check.capabilitySubject", { name: item.name }),
                })),
              ...product.components
                .filter((item) => item.archivedAt === null)
                .map((item) => ({
                  value: `component|${item.id}`,
                  label: t("check.componentSubject", { name: item.name }),
                })),
            ],
          },
        ]
      : []),
    {
      name: "claim",
      label: t("check.claim"),
      required: true,
      type: "textarea",
      helper: t("check.claimHelp"),
    },
    {
      name: "category",
      label: t("common.category"),
      required: true,
      type: "select",
      options: CHECK_CATEGORIES.map((value) => ({
        value,
        label: t(`categories.${value}`),
      })),
    },
    { name: "required", label: t("check.required"), type: "checkbox" },
    { name: "ownerLabel", label: t("check.owner"), required: true },
    {
      name: "method",
      label: t("check.method"),
      required: true,
      type: "textarea",
    },
    {
      name: "environment",
      label: t("check.environment"),
      required: true,
      helper: t("check.environmentHelp"),
    },
    {
      name: "maxAgeHours",
      label: t("check.validHours"),
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
      submitLabel={check ? t("check.saveRevision") : t("check.add")}
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
