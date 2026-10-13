"use client";

import { Stack } from "@mui/material";
import { ReleaseScope } from "@/components/capability/release-scope";
import { CapabilityVisualView } from "@/components/capability/capability-visual-view";
import { DependencyView } from "@/components/dependency/dependency-view";
import { CheckManager } from "@/components/evidence/check-manager";
import type { CheckSubjectScope } from "@/components/evidence/check-scope";
import { DecisionPanel } from "./decision-panel";
import { ReleaseAssetUploader } from "./release-asset-uploader";
import type { PublicationValues } from "./publication-form";
import type {
  DecisionInput,
  ProductContext,
  ReleaseCheck,
  ReleaseDetail,
  ReleaseEvaluation,
  ReleaseMutation,
  ReleaseView,
} from "@/lib/release-types";

export function ReleasePerspectives({
  view,
  detail,
  product,
  readiness,
  editable,
  mutate,
  now,
  loadCheckRevisions,
  onCheckScopeChange,
  subjectScope,
  focusedCheckId,
  focusedCapabilityId,
  onClearFocus,
  onInspectCheck,
  onReviewView,
  canRecord,
  record,
  publish,
  revoke,
  upload,
}: {
  view: ReleaseView;
  detail: ReleaseDetail;
  product: ProductContext;
  readiness: ReleaseEvaluation;
  editable: boolean;
  mutate: (
    mutation: Omit<ReleaseMutation, "expectedRevision">,
  ) => Promise<void>;
  now: number;
  loadCheckRevisions?: (checkId: string) => Promise<ReleaseCheck[]>;
  onCheckScopeChange: (scope: CheckSubjectScope | null) => void;
  subjectScope: CheckSubjectScope | null;
  focusedCheckId: string | null;
  focusedCapabilityId?: string | null;
  onClearFocus: () => void;
  onInspectCheck: (checkId: string) => void;
  onReviewView?: (view: ReleaseView, capabilityId?: string) => void;
  canRecord: boolean;
  record: (input: DecisionInput) => Promise<void>;
  publish: (decisionId: string, values: PublicationValues) => Promise<void>;
  revoke: (token: string) => Promise<void>;
  upload: (file: File, label: string) => Promise<void>;
}) {
  return (
    <>
      {view === "release" && (
        <ReleaseScope
          detail={detail}
          product={product}
          readiness={readiness}
          editable={editable}
          mutate={mutate}
          onInspectCheck={onInspectCheck}
          onReviewView={onReviewView}
        />
      )}
      {view === "visual" && (
        <CapabilityVisualView
          detail={detail}
          product={product}
          readiness={readiness}
          onReviewView={onReviewView}
          screensHref={editable ? `/boards/${product.board.id}` : undefined}
        />
      )}
      {view === "backend" && (
        <DependencyView
          key={focusedCapabilityId ?? "all"}
          initialCapabilityId={focusedCapabilityId}
          detail={detail}
          product={product}
          readiness={readiness}
          onCheckScopeChange={onCheckScopeChange}
        />
      )}
      {(view === "backend" || view === "qa" || view === "operations") && (
        <Stack component="section" aria-label="Check evidence">
          <CheckManager
            key={`${view}:${focusedCapabilityId ?? "all"}`}
            detail={detail}
            product={product}
            readiness={readiness}
            editable={editable}
            mutate={mutate}
            now={now}
            operationsOnly={view === "operations"}
            loadCheckRevisions={loadCheckRevisions}
            subjectScope={subjectScope ?? undefined}
            subjectLabel={
              view === "qa" && focusedCapabilityId
                ? detail.scope.find(
                    (item) => item.capabilityId === focusedCapabilityId,
                  )?.name
                : undefined
            }
            focusedCheckId={focusedCheckId}
            onClearFocus={onClearFocus}
          />
        </Stack>
      )}
      {view === "decision" && (
        <Stack spacing={3}>
          <DecisionPanel
            detail={detail}
            product={product}
            readiness={readiness}
            now={now}
            canRecord={canRecord}
            record={record}
            publish={publish}
            revoke={revoke}
          />
          {editable && (
            <ReleaseAssetUploader
              assets={detail.assets.filter(
                (asset) => asset.decisionId === null,
              )}
              upload={upload}
            />
          )}
        </Stack>
      )}
    </>
  );
}
