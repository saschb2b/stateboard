"use client";

import { useTranslations } from "next-intl";

import { Alert, Stack, Typography } from "@mui/material";
import { MutationForm } from "./mutation-form";
import { ReleaseContext } from "./release-context";
import { ReleaseFindings } from "./release-findings";
import type {
  DecisionInput,
  ProductContext,
  ReleaseDetail,
  ReleaseEvaluation,
} from "@/lib/release-types";

export function DecisionReview({
  detail,
  product,
  readiness,
  record,
  onCancel,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  readiness: ReleaseEvaluation;
  record: (input: DecisionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("Release");
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {t("decision.reviewRevision", {
          revision: detail.assessment.revision,
          candidate: detail.assessment.candidateLabel,
        })}
      </Typography>
      <ReleaseContext assessment={detail.assessment} />
      <Typography variant="body2">
        {t("decision.counts", {
          blockers: readiness.blockers.length,
          gaps: readiness.gaps.length,
        })}
      </Typography>
      <ReleaseFindings
        detail={detail}
        readiness={readiness}
        title={t("decision.preventingApproval")}
      />
      {readiness.state !== "ready" && (
        <Alert severity="warning">{t("decision.cannotApprove")}</Alert>
      )}
      <MutationForm
        key={`${detail.assessment.revision}-${readiness.state}`}
        fields={[
          {
            name: "decision",
            label: t("decision.label"),
            type: "select",
            required: true,
            options: [
              { value: "held", label: t("decision.hold") },
              ...(readiness.state === "ready"
                ? [{ value: "approved", label: t("decision.approve") }]
                : []),
            ],
          },
          {
            name: "rationale",
            label: t("decision.rationale"),
            required: true,
            type: "textarea",
          },
          {
            name: "screenIds",
            label: t("decision.screens"),
            type: "multi",
            helper: t("decision.screensHelp"),
            options: product.screens.map((screen) => ({
              value: screen.id,
              label: screen.label ?? t("decision.productScreen"),
            })),
          },
          {
            name: "assetIds",
            label: t("decision.privateImages"),
            type: "multi",
            helper: t("decision.privateImagesHelp"),
            options: detail.assets.map((asset) => ({
              value: asset.id,
              label: asset.decisionId
                ? t("decision.earlierImage", { label: asset.label })
                : asset.label,
            })),
          },
        ]}
        initial={{
          decision: "held",
          screenIds: [],
          assetIds: detail.assets
            .filter((asset) => asset.decisionId === null)
            .map((asset) => asset.id),
        }}
        submitLabel={t("decision.recordSnapshot")}
        onCancel={onCancel}
        onSubmit={async (values) => {
          await record({
            expectedRevision: detail.assessment.revision,
            decision: values.decision as DecisionInput["decision"],
            rationale: String(values.rationale),
            screenIds: values.screenIds as string[],
            assetIds: values.assetIds as string[],
          });
          onCancel();
        }}
      />
    </Stack>
  );
}
