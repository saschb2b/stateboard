"use client";

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
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        Review revision {detail.assessment.revision} ·{" "}
        {detail.assessment.candidateLabel}
      </Typography>
      <ReleaseContext assessment={detail.assessment} />
      <Typography variant="body2">
        Required blockers: {readiness.blockers.length} · Evidence gaps:{" "}
        {readiness.gaps.length}
      </Typography>
      <ReleaseFindings
        detail={detail}
        readiness={readiness}
        title="Required checks preventing approval"
      />
      {readiness.state !== "ready" && (
        <Alert severity="warning">
          This assessment cannot be approved yet. You can record a held
          decision.
        </Alert>
      )}
      <MutationForm
        key={`${detail.assessment.revision}-${readiness.state}`}
        fields={[
          {
            name: "decision",
            label: "Decision",
            type: "select",
            required: true,
            options: [
              { value: "held", label: "Hold release" },
              ...(readiness.state === "ready"
                ? [{ value: "approved", label: "Approve release" }]
                : []),
            ],
          },
          {
            name: "rationale",
            label: "Decision rationale",
            required: true,
            type: "textarea",
          },
          {
            name: "screenIds",
            label: "Screens to retain in this review",
            type: "multi",
            helper:
              "Selected screenshots are copied into the decision record so later replacement or deletion cannot alter this review.",
            options: product.screens.map((screen) => ({
              value: screen.id,
              label: screen.label ?? "Product screen",
            })),
          },
          {
            name: "assetIds",
            label: "Private images to retain",
            type: "multi",
            helper:
              "Choose supporting images for this review. Previously reviewed images are included only when selected here.",
            options: detail.assets.map((asset) => ({
              value: asset.id,
              label: asset.decisionId
                ? `${asset.label} · earlier review image`
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
        submitLabel="Record reviewed snapshot"
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
