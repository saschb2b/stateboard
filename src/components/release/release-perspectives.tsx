"use client";

import { useTranslations } from "next-intl";

import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
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
  onReviewView?: (view: ReleaseView, capabilityId?: string) => void;
  canRecord: boolean;
  record: (input: DecisionInput) => Promise<void>;
  publish: (decisionId: string, values: PublicationValues) => Promise<void>;
  revoke: (token: string) => Promise<void>;
  upload: (file: File, label: string) => Promise<void>;
}) {
  const t = useTranslations("Release");
  const productT = useTranslations("Product");
  return (
    <>
      {view === "release" && (
        <ReleaseScope
          detail={detail}
          product={product}
          readiness={readiness}
          editable={editable}
          mutate={mutate}
          onReviewView={onReviewView}
          now={now}
          loadCheckRevisions={loadCheckRevisions}
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
      {view === "backend" &&
        !focusedCapabilityId &&
        !focusedComponentId &&
        !focusedCheckId && (
          <Typography variant="body2" color="text.secondary">
            {productT("chooseSupportingContext")}
          </Typography>
        )}
      {((view === "backend" &&
        (focusedCapabilityId || focusedComponentId || focusedCheckId)) ||
        view === "qa" ||
        view === "operations") && (
        <Stack
          component="section"
          aria-label={t("workspace.checkEvidence")}
          spacing={2}
        >
          {(view === "qa" || view === "operations") && onReviewView && (
            <ToggleButtonGroup
              exclusive
              value={view}
              aria-label={productT("checkArea")}
              size="small"
              onChange={(_, next: "qa" | "operations" | null) => {
                if (next) onReviewView(next);
              }}
              sx={{ alignSelf: "flex-start", flexWrap: "wrap" }}
            >
              <ToggleButton value="qa">
                {productT("allCheckAreas")}
              </ToggleButton>
              <ToggleButton value="operations">
                {productT("operationsCheckAreas")}
              </ToggleButton>
            </ToggleButtonGroup>
          )}
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
            defaultSubject={
              focusedComponentId
                ? { type: "component", id: focusedComponentId }
                : focusedCapabilityId
                  ? { type: "capability", id: focusedCapabilityId }
                  : undefined
            }
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
