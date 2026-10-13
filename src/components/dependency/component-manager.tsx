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
  TextField,
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
import { productComponentFocus } from "./dependency-focus";

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
  const [linking, setLinking] = useState<ProductComponent | null>(null);
  const [browseWorkspace, setBrowseWorkspace] = useState(false);
  const [search, setSearch] = useState("");
  const focus = productComponentFocus(product);
  const linkedIds = new Set(focus.componentIds);
  const active = product.components.filter((item) => item.archivedAt === null);
  const linked = active.filter((item) => linkedIds.has(item.id));
  const available = active.filter((item) => !linkedIds.has(item.id));
  const shown = (browseWorkspace ? active : linked).filter((item) =>
    `${item.name} ${item.description} ${item.ownerLabel}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  const linkFields: FormField[] = [
    {
      name: "capabilityId",
      label: "Capability",
      type: "select",
      required: true,
      options: product.capabilities
        .filter((item) => item.archivedAt === null)
        .map((item) => ({ value: item.id, label: item.name })),
    },
    {
      name: "relation",
      label: "Relationship",
      required: true,
      helper: "e.g. calls, consumes, reads, requires",
    },
    { name: "description", label: "Contract or purpose", type: "textarea" },
    {
      name: "required",
      label: "Required for this capability",
      type: "checkbox",
    },
  ];
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h6">Dependencies and owners</Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>Add component</Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Linked to this product: {linked.length} · Available in workspace:{" "}
        {available.length}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button
          onClick={() => {
            setBrowseWorkspace(!browseWorkspace);
            setSearch("");
          }}
        >
          {browseWorkspace
            ? "Show linked components"
            : "Browse workspace components"}
        </Button>
        <TextField
          size="small"
          label={
            browseWorkspace
              ? "Search workspace components"
              : "Search linked components"
          }
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>
      {browseWorkspace && (
        <Typography variant="body2" color="text.secondary">
          Components are shared within the workspace. Link an existing component
          to reuse it; edits apply wherever it is linked.
        </Typography>
      )}
      {focus.truncated && (
        <Typography variant="body2" color="warning.main">
          Linked dependency context is limited to 200 components. Browse the
          workspace to inspect additional components.
        </Typography>
      )}
      {shown.length === 0 && (
        <Typography color="text.secondary">
          {search
            ? "No components match this search."
            : "No components are linked to this product yet. Browse the workspace to reuse one, or add a component and link it to a capability."}
        </Typography>
      )}
      {shown.map((item) => (
        <Paper key={item.id} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Chip size="small" label={item.kind} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    linkedIds.has(item.id)
                      ? "Linked to product"
                      : "Available to link"
                  }
                />
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
              <Stack direction="row" flexWrap="wrap" alignContent="start">
                {!linkedIds.has(item.id) && (
                  <Button size="small" onClick={() => setLinking(item)}>
                    Link to capability
                  </Button>
                )}
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
        open={linking !== null}
        onClose={() => setLinking(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Link {linking?.name} to this product</DialogTitle>
        <DialogContent>
          {linking && (
            <MutationForm
              key={linking.id}
              fields={linkFields}
              initial={{ required: true }}
              submitLabel="Save connection"
              onCancel={() => setLinking(null)}
              onSubmit={async (data) => {
                await mutate({
                  type: "capability_component.put",
                  data: { ...data, componentId: linking.id },
                });
                setLinking(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
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
                if (editing === "new") {
                  setBrowseWorkspace(true);
                  setSearch(String(data.name));
                }
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
