"use client";

import { useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { MutationForm } from "@/components/release/mutation-form";
import { ReadinessChip } from "@/components/release/readiness-summary";
import type {
  ProductContext,
  ReleaseCapability,
  ReleaseDetail,
  ReleaseEvaluation,
  ReleaseMutation,
} from "@/lib/release-types";

export function ReleaseScope({
  detail,
  product,
  readiness,
  editable,
  mutate,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  readiness: ReleaseEvaluation;
  editable: boolean;
  mutate: (
    mutation: Omit<ReleaseMutation, "expectedRevision">,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState<ReleaseCapability | "add" | null>(
    null,
  );
  const available = product.capabilities.filter(
    (item) =>
      item.archivedAt === null &&
      !detail.scope.some((scope) => scope.capabilityId === item.id),
  );
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h6">Capabilities in this assessment</Typography>
        {editable && available.length > 0 && (
          <Button onClick={() => setEditing("add")}>Add to scope</Button>
        )}
      </Stack>
      {detail.scope.map((item) => {
        const evaluation = readiness.capabilities.find(
          (result) => result.capabilityId === item.capabilityId,
        );
        const latest = product.capabilities.find(
          (capability) => capability.id === item.capabilityId,
        );
        return (
          <Paper
            key={item.capabilityId}
            sx={{ p: 2.5, opacity: item.included ? 1 : 0.75 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={1}
            >
              <Stack spacing={0.5}>
                <Typography variant="h6">{item.name}</Typography>
                <Typography>{item.outcome}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.ownerLabel} · Definition {item.definitionRevision}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.scopeReason}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                {item.included && evaluation ? (
                  <ReadinessChip state={evaluation.state} />
                ) : (
                  <Chip size="small" label="Excluded from release" />
                )}
                {editable && (
                  <Button size="small" onClick={() => setEditing(item)}>
                    Edit scope
                  </Button>
                )}
              </Stack>
            </Stack>
            {item.included &&
              evaluation?.reasons.map((reason, index) => (
                <Typography key={index} variant="body2" sx={{ mt: 1 }}>
                  {reason}
                </Typography>
              ))}
            {latest && latest.definitionRevision > item.definitionRevision && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Product definition {latest.definitionRevision} is newer. Review
                and adopt it explicitly to update this assessment.
              </Typography>
            )}
          </Paper>
        );
      })}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing === "add"
            ? "Add capability to this assessment"
            : "Review capability scope"}
        </DialogTitle>
        <DialogContent>
          {editing && (
            <MutationForm
              key={typeof editing === "string" ? editing : editing.capabilityId}
              fields={[
                ...(editing === "add"
                  ? [
                      {
                        name: "capabilityId",
                        label: "Capability",
                        type: "select" as const,
                        required: true,
                        options: available.map((item) => ({
                          value: item.id,
                          label: item.name,
                        })),
                      },
                    ]
                  : []),
                {
                  name: "included",
                  label: "Included in this release",
                  type: "checkbox",
                },
                {
                  name: "scopeReason",
                  label: "Reason for including or excluding",
                  type: "textarea",
                  required: true,
                },
                ...(editing !== "add"
                  ? [
                      {
                        name: "adoptLatest",
                        label:
                          "Adopt the latest product definition and require fresh verification",
                        type: "checkbox" as const,
                      },
                    ]
                  : []),
              ]}
              initial={
                editing === "add"
                  ? { included: true }
                  : {
                      included: editing.included,
                      scopeReason: editing.scopeReason,
                      adoptLatest: false,
                    }
              }
              submitLabel="Save scope"
              onCancel={() => setEditing(null)}
              onSubmit={async (data) => {
                await mutate({
                  type: "scope.put",
                  data: {
                    ...data,
                    capabilityId:
                      editing === "add"
                        ? data.capabilityId
                        : editing.capabilityId,
                  },
                });
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
