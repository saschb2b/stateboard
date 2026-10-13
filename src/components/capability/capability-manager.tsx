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
import {
  MutationForm,
  type FormField,
} from "@/components/release/mutation-form";
import type {
  Capability,
  ProductContext,
  ProductMutation,
} from "@/lib/release-types";

const fields: FormField[] = [
  {
    name: "name",
    label: "Capability name",
    required: true,
    helper: "e.g. Receive a partner webhook",
  },
  {
    name: "outcome",
    label: "Expected outcome",
    required: true,
    type: "textarea",
  },
  { name: "ownerLabel", label: "Accountable owner", required: true },
];
export function CapabilityManager({
  product,
  editable,
  mutate,
}: {
  product: ProductContext;
  editable: boolean;
  mutate: (mutation: ProductMutation) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Capability | "new" | null>(null);
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Product capabilities</Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>Add capability</Button>
        )}
      </Stack>
      {product.capabilities
        .filter((item) => item.archivedAt === null)
        .map((item) => (
          <Paper key={item.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Typography variant="body2">{item.outcome}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.ownerLabel} · Definition {item.definitionRevision}
                </Typography>
                {item.ownerNeedsReassignment && (
                  <Typography variant="body2" color="warning.main">
                    Owner membership ended; review accountability.
                  </Typography>
                )}
              </Stack>
              {editable && (
                <Stack direction="row">
                  <Button size="small" onClick={() => setEditing(item)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="warning"
                    onClick={() =>
                      void mutate({
                        type: "capability.archive",
                        id: item.id,
                        data: {},
                      }).catch(() => {})
                    }
                  >
                    Archive
                  </Button>
                </Stack>
              )}
            </Stack>
            <Chip
              size="small"
              sx={{ mt: 1 }}
              label={`${product.regionCapabilities.filter((link) => link.capabilityId === item.id).length} visual anchors`}
            />
          </Paper>
        ))}
      {product.capabilities.filter((item) => item.archivedAt === null)
        .length === 0 && (
        <Typography color="text.secondary">
          Start with one outcome. Capabilities can include screens or work
          entirely without a UI.
        </Typography>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing === "new" ? "Add capability" : "Edit capability"}
        </DialogTitle>
        <DialogContent>
          {editing && (
            <MutationForm
              key={typeof editing === "string" ? editing : editing.id}
              fields={fields}
              initial={
                typeof editing === "string"
                  ? {}
                  : {
                      name: editing.name,
                      outcome: editing.outcome,
                      ownerLabel: editing.ownerLabel,
                    }
              }
              submitLabel="Save capability"
              onCancel={() => setEditing(null)}
              onSubmit={async (data) => {
                await mutate({
                  type:
                    editing === "new"
                      ? "capability.create"
                      : "capability.update",
                  id: typeof editing === "string" ? undefined : editing.id,
                  data,
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
