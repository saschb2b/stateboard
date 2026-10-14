"use client";

import { useTranslations } from "next-intl";
import { Stack, Typography } from "@mui/material";
import {
  MutationForm,
  type FormField,
} from "@/components/release/mutation-form";
import {
  CHECK_CATEGORIES,
  type CheckCategory,
  type ProductContext,
  type ReleaseCheck,
  type ReleaseDetail,
  type ReleaseMutation,
} from "@/lib/release-types";

export interface CheckSubject {
  type: ReleaseCheck["subjectType"];
  id: string | null;
}

export function CheckEditor({
  detail,
  product,
  check,
  defaultSubject,
  defaultClaim,
  defaultCategory = "functional",
  onSave,
  onCancel,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  check: ReleaseCheck | null;
  defaultSubject?: CheckSubject;
  defaultClaim?: string;
  defaultCategory?: CheckCategory;
  onSave: (
    mutation: Omit<ReleaseMutation, "expectedRevision">,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("Release");
  const subject = check
    ? { type: check.subjectType, id: check.subjectId }
    : (defaultSubject ?? { type: "release", id: null });
  const fixedSubject = check !== null || defaultSubject !== undefined;
  const subjectValue = `${subject.type}|${subject.id ?? ""}`;
  const subjects = [
    {
      value: "release|",
      label: t("common.entireRelease"),
      owner: detail.assessment.ownerLabel,
    },
    ...detail.scope
      .filter((item) => item.included)
      .map((item) => ({
        value: `capability|${item.capabilityId}`,
        label: t("check.capabilitySubject", { name: item.name }),
        owner: item.ownerLabel,
      })),
    ...product.components
      .filter((item) => item.archivedAt === null)
      .map((item) => ({
        value: `component|${item.id}`,
        label: t("check.componentSubject", { name: item.name }),
        owner: item.ownerLabel,
      })),
  ];
  const selectedSubject = subjects.find((item) => item.value === subjectValue);
  const fields: FormField[] = [
    ...(!fixedSubject
      ? [
          {
            name: "subject",
            label: t("check.subject"),
            required: true,
            type: "select" as const,
            options: subjects,
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
      name: "method",
      label: t("check.method"),
      required: true,
      type: "textarea",
      helper: t("check.methodHelp"),
    },
    { name: "required", label: t("check.required"), type: "checkbox" },
  ];
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {t("check.purpose")}
      </Typography>
      {fixedSubject && (
        <Typography variant="body2">
          {t("check.forSubject", {
            subject:
              selectedSubject?.label ??
              t(
                `common.${subject.type === "release" ? "entireRelease" : subject.type}`,
              ),
          })}
        </Typography>
      )}
      <MutationForm
        key={check?.id ?? subjectValue}
        fields={fields}
        details={{
          label: t("check.settings"),
          summary: (values) =>
            t("check.settingsSummary", {
              owner: String(values.ownerLabel),
              environment: String(values.environment),
              hours: Number(values.maxAgeHours),
            }),
          fields: [
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
            { name: "ownerLabel", label: t("check.owner"), required: true },
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
          ],
        }}
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
                subject: subjectValue,
                claim: defaultClaim ?? "",
                category: defaultCategory,
                required: true,
                ownerLabel:
                  selectedSubject?.owner ?? detail.assessment.ownerLabel,
                environment: detail.assessment.validationEnvironment,
                maxAgeHours: 24,
              }
        }
        onValuesChange={(values, field) =>
          field === "subject"
            ? {
                ...values,
                ownerLabel:
                  subjects.find((item) => item.value === values.subject)
                    ?.owner ?? detail.assessment.ownerLabel,
              }
            : values
        }
        submitLabel={check ? t("check.saveRevision") : t("check.add")}
        onCancel={onCancel}
        onSubmit={async (values) => {
          const [subjectType, subjectId] = String(
            values.subject ?? subjectValue,
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
    </Stack>
  );
}
