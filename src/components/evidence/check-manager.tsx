"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CheckEditor } from "./check-editor";
import { EvidenceForm } from "./evidence-form";
import { CheckRow } from "./check-row";
import {
  filterChecks,
  type CheckFilters as CheckFilterValues,
  type CheckSubjectScope,
} from "./check-scope";
import { CheckFilters } from "./check-filters";
import type {
  CheckCategory,
  ProductContext,
  ReleaseCheck,
  ReleaseDetail,
  ReleaseEvaluation,
  ReleaseMutation,
} from "@/lib/release-types";

export function CheckManager({
  detail,
  product,
  readiness,
  editable,
  mutate,
  now,
  operationsOnly = false,
  loadCheckRevisions,
  subjectScope,
  subjectLabel,
  focusedCheckId,
  onClearFocus,
  initialCategory,
  onCategoryChange,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  readiness: ReleaseEvaluation;
  editable: boolean;
  mutate: (
    mutation: Omit<ReleaseMutation, "expectedRevision">,
  ) => Promise<void>;
  now: number;
  operationsOnly?: boolean;
  loadCheckRevisions?: (checkId: string) => Promise<ReleaseCheck[]>;
  subjectScope?: CheckSubjectScope;
  subjectLabel?: string;
  focusedCheckId?: string | null;
  onClearFocus?: () => void;
  initialCategory?: CheckCategory | null;
  onCategoryChange?: (category: CheckCategory | null) => void;
}) {
  const t = useTranslations("Release");
  const [editing, setEditing] = useState<ReleaseCheck | "new" | null>(null);
  const [reviewing, setReviewing] = useState<ReleaseCheck | null>(null);
  const [filters, setFilters] = useState<CheckFilterValues>({
    needsAttention: false,
    result: "all",
    category: initialCategory ?? "all",
    query: "",
    includeFunctional: false,
  });
  const scopeFilters = {
    subjectScope,
    operationsOnly,
    includeFunctional: filters.includeFunctional,
  };
  const scopedChecks = filterChecks(
    detail.checks,
    readiness.checks,
    scopeFilters,
  );
  const attentionChecks = filterChecks(detail.checks, readiness.checks, {
    ...scopeFilters,
    needsAttention: true,
  });
  const checks = filterChecks(detail.checks, readiness.checks, {
    ...filters,
    ...scopeFilters,
    focusedCheckId,
  });
  function resetFilters() {
    setFilters({
      includeFunctional: filters.includeFunctional,
      needsAttention: false,
      result: "all",
      category: "all",
      query: "",
    });
    onCategoryChange?.(null);
  }
  function changeFilters(patch: Partial<CheckFilterValues>) {
    setFilters((current) => ({ ...current, ...patch }));
    if (patch.category !== undefined)
      onCategoryChange?.(patch.category === "all" ? null : patch.category);
  }
  function subject(check: ReleaseCheck) {
    return check.subjectType === "release"
      ? t("common.entireRelease")
      : check.subjectType === "capability"
        ? (detail.scope.find((item) => item.capabilityId === check.subjectId)
            ?.name ?? t("common.capability"))
        : (product.components.find((item) => item.id === check.subjectId)
            ?.name ?? t("common.component"));
  }
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography variant="h6">
          {operationsOnly ? t("check.operations") : t("common.checks")}
        </Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>{t("check.add")}</Button>
        )}
      </Stack>
      {focusedCheckId && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="body2" color="text.secondary">
            {checks.length ? t("check.selected") : t("check.inactive")}
          </Typography>
          {onClearFocus && (
            <Button
              size="small"
              onClick={() => {
                resetFilters();
                onClearFocus();
              }}
            >
              {t("workspace.clearCheck")}
            </Button>
          )}
        </Stack>
      )}
      {!focusedCheckId && subjectLabel && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Stack spacing={0.25}>
            <Typography variant="body2">{subjectLabel}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t("check.scopeHelp")}
            </Typography>
          </Stack>
          {onClearFocus && (
            <Button
              size="small"
              onClick={() => {
                resetFilters();
                onClearFocus();
              }}
            >
              {t("check.clearCapability")}
            </Button>
          )}
        </Stack>
      )}
      {!focusedCheckId && (
        <CheckFilters
          filters={filters}
          onChange={changeFilters}
          onReset={resetFilters}
          operationsOnly={operationsOnly}
          total={scopedChecks.length}
          shown={checks.length}
          requiredAttention={
            attentionChecks.filter((check) => check.required).length
          }
          optionalWarnings={
            attentionChecks.filter((check) => !check.required).length
          }
        />
      )}
      <Paper sx={{ overflow: "hidden" }}>
        {checks.map((check) => (
          <CheckRow
            key={`${check.id}:${focusedCheckId === check.id}`}
            check={check}
            subject={subject(check)}
            detail={detail}
            evaluation={readiness.checks.find(
              (item) => item.checkId === check.id,
            )}
            now={now}
            editable={editable}
            initiallyExpanded={focusedCheckId === check.id}
            onRecord={() => setReviewing(check)}
            onRevise={() => setEditing(check)}
            onArchive={() =>
              void mutate({
                type: "check.archive",
                id: check.id,
                data: {},
              }).catch(() => {})
            }
            loadRevisions={
              loadCheckRevisions
                ? () => loadCheckRevisions(check.id)
                : undefined
            }
          />
        ))}
        {checks.length === 0 && !focusedCheckId && (
          <Typography color="text.secondary" variant="body2" sx={{ p: 3 }}>
            {scopedChecks.length ? t("check.noMatches") : t("check.empty")}
          </Typography>
        )}
      </Paper>
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing === "new"
            ? t("check.addAcceptance")
            : t("check.reviseAcceptance")}
        </DialogTitle>
        <DialogContent>
          {editing && (
            <CheckEditor
              detail={detail}
              product={product}
              check={editing === "new" ? null : editing}
              onSave={mutate}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("check.recordVerification")}</DialogTitle>
        <DialogContent>
          {reviewing && (
            <EvidenceForm
              assessment={detail.assessment}
              check={reviewing}
              now={now}
              onSave={mutate}
              onCancel={() => setReviewing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
