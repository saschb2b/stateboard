"use client";

import { useTranslations } from "next-intl";

import { Stack } from "@mui/material";
import { ReleaseScope } from "@/components/capability/release-scope";
import { CapabilityVisualView } from "@/components/capability/capability-visual-view";
import {
  DependencyView,
  type DependencySelection,
} from "@/components/dependency/dependency-view";
import { CheckManager } from "@/components/evidence/check-manager";
import type { CheckSubjectScope } from "@/components/evidence/check-scope";
import { DecisionPanel } from "./decision-panel";
import { ReleaseAssetUploader } from "./release-asset-uploader";
import type { PublicationValues } from "./publication-form";
import type {
  DecisionInput,
  CheckCategory,
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
  onDependencyFocusChange,
  subjectScope,
  focusedCheckId,
  focusedCapabilityId,
  focusedComponentId,
  category,
  onCategoryChange,
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
  onDependencyFocusChange?: (focus: DependencySelection) => void;
  subjectScope: CheckSubjectScope | null;
  focusedCheckId: string | null;
  focusedCapabilityId?: string | null;
  focusedComponentId?: string | null;
  category?: CheckCategory | null;
  onCategoryChange?: (category: CheckCategory | null) => void;
  onClearFocus: () => void;
  onInspectCheck: (checkId: string) => void;
  onReviewView?: (view: ReleaseView, capabilityId?: string) => void;
  canRecord: boolean;
  record: (input: DecisionInput) => Promise<void>;
  publish: (decisionId: string, values: PublicationValues) => Promise<void>;
  revoke: (token: string) => Promise<void>;
  upload: (file: File, label: string) => Promise<void>;
}) {
  const t = useTranslations("Release");
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
          focus={
            onDependencyFocusChange
              ? {
                  capabilityId: focusedCapabilityId ?? null,
                  componentId: focusedComponentId ?? null,
                }
              : undefined
          }
          initialCapabilityId={focusedCapabilityId}
          onFocusChange={onDependencyFocusChange}
          detail={detail}
          product={product}
          readiness={readiness}
        />
      )}
      {(view === "backend" || view === "qa" || view === "operations") && (
        <Stack component="section" aria-label={t("workspace.checkEvidence")}>
          <CheckManager
            key={`${view}:${focusedCapabilityId ?? "all"}:${focusedComponentId ?? "all"}`}
            category={category}
            onCategoryChange={onCategoryChange}
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
