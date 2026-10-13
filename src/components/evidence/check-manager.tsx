"use client";

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
  focusedCheckId,
  onClearFocus,
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
  focusedCheckId?: string | null;
  onClearFocus?: () => void;
}) {
  const [editing, setEditing] = useState<ReleaseCheck | "new" | null>(null);
  const [reviewing, setReviewing] = useState<ReleaseCheck | null>(null);
  const [filters, setFilters] = useState<CheckFilterValues>({
    needsAttention: false,
    result: "all",
    category: "all",
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
  }
  function subject(check: ReleaseCheck) {
    return check.subjectType === "release"
      ? "Entire release"
      : check.subjectType === "capability"
        ? (detail.scope.find((item) => item.capabilityId === check.subjectId)
            ?.name ?? "Capability")
        : (product.components.find((item) => item.id === check.subjectId)
            ?.name ?? "Component");
  }
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography variant="h6">
          {operationsOnly ? "Operational checks" : "Checks"}
        </Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>Add check</Button>
        )}
      </Stack>
      {focusedCheckId && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="body2" color="text.secondary">
            {checks.length
              ? "Selected check"
              : "This check is no longer active."}
          </Typography>
          {onClearFocus && (
            <Button
              size="small"
              onClick={() => {
                resetFilters();
                onClearFocus();
              }}
            >
              Clear check focus
            </Button>
          )}
        </Stack>
      )}
      {!focusedCheckId && (
        <CheckFilters
          filters={filters}
          onChange={(patch) =>
            setFilters((current) => ({ ...current, ...patch }))
          }
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
            {scopedChecks.length
              ? "No matching checks. Try another filter."
              : "No checks in this view."}
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
            ? "Add acceptance check"
            : "Revise acceptance check"}
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
        <DialogTitle>Record verification evidence</DialogTitle>
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
