"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  onInspectCheck,
}: {
  detail: ReleaseDetail;
  product: ProductContext;
  readiness: ReleaseEvaluation;
  editable: boolean;
  onInspectCheck?: (checkId: string) => void;
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
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" component="h2">
          Capabilities
          <Box
            component="span"
            sx={{ ml: 1, color: "text.secondary", fontWeight: 400 }}
          >
            {detail.scope.length}
          </Box>
        </Typography>
        {editable && available.length > 0 && (
          <Button size="small" onClick={() => setEditing("add")}>
            Add to scope
          </Button>
        )}
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: "divider" }}>
        {detail.scope.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            No capabilities in this assessment.
          </Typography>
        )}
        {detail.scope.map((item) => {
          const evaluation = readiness.capabilities.find(
            (result) => result.capabilityId === item.capabilityId,
          );
          const latest = product.capabilities.find(
            (capability) => capability.id === item.capabilityId,
          );
          const newerDefinition =
            latest && latest.definitionRevision > item.definitionRevision;
          const acceptanceCheck = detail.checks.find(
            (check) =>
              check.subjectType === "capability" &&
              check.subjectId === item.capabilityId &&
              check.category === "functional" &&
              check.required &&
              check.archivedAt === null,
          );
          return (
            <Accordion
              key={item.capabilityId}
              disableGutters
              square
              slotProps={{ transition: { unmountOnExit: true } }}
              sx={{
                bgcolor: "background.default",
                border: 0,
                borderBottom: 1,
                borderColor: "divider",
                "&::before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                aria-label={`Details for ${item.name}`}
                aria-describedby={`capability-status-${item.capabilityId}`}
                sx={{
                  px: 0,
                  py: 0.25,
                  gap: 1.5,
                  "& .MuiAccordionSummary-content": { minWidth: 0 },
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  gap={{ xs: 0.5, sm: 2 }}
                  sx={{ width: "100%", minWidth: 0 }}
                >
                  <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: item.included
                          ? "text.primary"
                          : "text.secondary",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.outcome}
                    </Typography>
                    {newerDefinition && (
                      <Typography variant="caption" color="warning.main">
                        Newer definition available
                      </Typography>
                    )}
                  </Box>
                  <Box
                    id={`capability-status-${item.capabilityId}`}
                    sx={{ flexShrink: 0 }}
                  >
                    {item.included && evaluation ? (
                      <ReadinessChip state={evaluation.state} verification />
                    ) : (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={item.included ? "Not evaluated" : "Excluded"}
                      />
                    )}
                  </Box>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0.5, pb: 2.5 }}>
                <Stack spacing={1.5} sx={{ maxWidth: 760 }}>
                  <Typography variant="body2">{item.outcome}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.ownerLabel} · Definition {item.definitionRevision}
                  </Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.included ? "Included because" : "Excluded because"}
                    </Typography>
                    <Typography variant="body2">{item.scopeReason}</Typography>
                  </Box>
                  {item.included &&
                    evaluation?.reasons.map((reason, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        color="text.secondary"
                      >
                        {reason}
                      </Typography>
                    ))}
                  {newerDefinition && (
                    <Typography variant="body2" color="warning.main">
                      Product definition {latest.definitionRevision} is newer.
                      {editable
                        ? " Edit scope to review and adopt it."
                        : ` This assessment uses definition ${item.definitionRevision}.`}
                    </Typography>
                  )}
                  {(editable ||
                    (item.included && acceptanceCheck && onInspectCheck)) && (
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      {item.included && acceptanceCheck && onInspectCheck && (
                        <Button
                          size="small"
                          onClick={() => onInspectCheck(acceptanceCheck.id)}
                        >
                          Inspect acceptance check
                        </Button>
                      )}
                      {editable && (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => setEditing(item)}
                        >
                          Edit scope
                        </Button>
                      )}
                    </Stack>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
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
