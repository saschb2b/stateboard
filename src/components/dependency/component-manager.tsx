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
import {
  COMPONENT_KINDS,
  type ProductComponent,
  type ProductContext,
  type ProductMutation,
} from "@/lib/release-types";

const fields: FormField[] = [
  { name: "name", label: "Component name", required: true },
  {
    name: "kind",
    label: "Kind",
    type: "select",
    required: true,
    options: COMPONENT_KINDS.map((value) => ({ value, label: value })),
  },
  { name: "ownerLabel", label: "Accountable owner", required: true },
  { name: "description", label: "Purpose", type: "textarea" },
  {
    name: "referenceUrl",
    label: "Reference link",
    helper: "Optional link to existing internal documentation.",
  },
];
export function ComponentManager({
  product,
  editable,
  mutate,
}: {
  product: ProductContext;
  editable: boolean;
  mutate: (mutation: ProductMutation) => Promise<void>;
}) {
  const [editing, setEditing] = useState<ProductComponent | "new" | null>(null);
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h6">Dependencies and owners</Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>Add component</Button>
        )}
      </Stack>
      {product.components
        .filter((item) => item.archivedAt === null)
        .map((item) => (
          <Paper key={item.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Stack spacing={0.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1">{item.name}</Typography>
                  <Chip size="small" label={item.kind} />
                </Stack>
                <Typography variant="body2">{item.description}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.ownerLabel}
                </Typography>
                {item.ownerNeedsReassignment && (
                  <Typography variant="body2" color="warning.main">
                    Owner membership ended; review accountability.
                  </Typography>
                )}
                {item.referenceUrl && (
                  <Button
                    size="small"
                    component="a"
                    href={item.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open reference
                  </Button>
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
                        type: "component.archive",
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
          </Paper>
        ))}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing === "new" ? "Add component" : "Edit component"}
        </DialogTitle>
        <DialogContent>
          {editing && (
            <MutationForm
              key={typeof editing === "string" ? editing : editing.id}
              fields={fields}
              initial={
                typeof editing === "string"
                  ? { kind: "service" }
                  : {
                      name: editing.name,
                      kind: editing.kind,
                      ownerLabel: editing.ownerLabel,
                      description: editing.description,
                      referenceUrl: editing.referenceUrl ?? "",
                    }
              }
              submitLabel="Save component"
              onCancel={() => setEditing(null)}
              onSubmit={async (data) => {
                await mutate({
                  type:
                    editing === "new" ? "component.create" : "component.update",
                  id: typeof editing === "string" ? undefined : editing.id,
                  data: { ...data, referenceUrl: data.referenceUrl || null },
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
