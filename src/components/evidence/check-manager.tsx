"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CheckEditor } from "./check-editor";
import { EvidenceForm } from "./evidence-form";
import { EvidenceHistory } from "./evidence-history";
import { CheckRevisionHistory } from "./check-revision-history";
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
          {operationsOnly
            ? "Operations, security, and data requirements"
            : "Acceptance checks and evidence"}
        </Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>Add check</Button>
        )}
      </Stack>
      {focusedCheckId && (
        <Alert
          severity={checks.length ? "info" : "warning"}
          action={
            onClearFocus && (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  resetFilters();
                  onClearFocus();
                }}
              >
                Clear check focus
              </Button>
            )
          }
        >
          {checks.length
            ? "Focused check. Other check filters are paused."
            : "This check is no longer active in this assessment."}
        </Alert>
      )}
      <CheckFilters
        filters={filters}
        onChange={(patch) =>
          setFilters((current) => ({ ...current, ...patch }))
        }
        onReset={resetFilters}
        operationsOnly={operationsOnly}
        disabled={Boolean(focusedCheckId)}
        total={scopedChecks.length}
        shown={checks.length}
        requiredAttention={
          attentionChecks.filter((check) => check.required).length
        }
        optionalWarnings={
          attentionChecks.filter((check) => !check.required).length
        }
      />
      {checks.map((check) => {
        const evaluation = readiness.checks.find(
          (item) => item.checkId === check.id,
        );
        return (
          <Paper key={check.id} sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                gap={1}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">{check.claim}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {subject(check)} · {check.category} · {check.ownerLabel}
                  </Typography>
                  <Typography variant="caption">
                    {check.required ? "Required" : "Optional"} · Revision{" "}
                    {check.revision} · {check.environment} · Evidence expires
                    after {check.maxAgeMs / 3_600_000} hours
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={evaluation?.state ?? "Not evaluated"}
                  color={
                    evaluation?.state === "pass"
                      ? "success"
                      : evaluation?.state === "fail"
                        ? "error"
                        : "warning"
                  }
                  variant="outlined"
                />
              </Stack>
              <Typography variant="body2">{check.method}</Typography>
              {evaluation && (
                <Alert
                  severity={
                    evaluation.state === "pass"
                      ? "success"
                      : evaluation.state === "fail" && check.required
                        ? "error"
                        : "warning"
                  }
                >
                  {evaluation.reason}
                </Alert>
              )}
              {editable && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setReviewing(check)}
                  >
                    Record evidence
                  </Button>
                  <Button size="small" onClick={() => setEditing(check)}>
                    Revise check
                  </Button>
                  <Button
                    size="small"
                    color="warning"
                    onClick={() =>
                      void mutate({
                        type: "check.archive",
                        id: check.id,
                        data: {},
                      }).catch(() => {})
                    }
                  >
                    Archive
                  </Button>
                </Stack>
              )}
              <EvidenceHistory
                detail={detail}
                check={check}
                evaluation={evaluation}
                now={now}
              />
              <CheckRevisionHistory
                check={check}
                load={
                  loadCheckRevisions
                    ? () => loadCheckRevisions(check.id)
                    : undefined
                }
              />
            </Stack>
          </Paper>
        );
      })}
      {checks.length === 0 && !focusedCheckId && (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            {scopedChecks.length
              ? "No checks match these filters. Reset filters to inspect this scope."
              : "No checks are defined in this view or selected scope. Required claims need their own evidence."}
          </Typography>
        </Paper>
      )}
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
