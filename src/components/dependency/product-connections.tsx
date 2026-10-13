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
import {
  MutationForm,
  type FormField,
} from "@/components/release/mutation-form";
import type { ProductContext, ProductMutation } from "@/lib/release-types";
import { productComponentFocus } from "./dependency-focus";

type Connection = "capability" | "dependency" | "region";
export function ProductConnections({
  product,
  editable,
  mutate,
}: {
  product: ProductContext;
  editable: boolean;
  mutate: (mutation: ProductMutation) => Promise<void>;
}) {
  const [adding, setAdding] = useState<Connection | null>(null);
  const linkedComponentIds = new Set(
    productComponentFocus(product).componentIds,
  );
  const capabilityIds = new Set(
    product.capabilities
      .filter((item) => !item.archivedAt)
      .map((item) => item.id),
  );
  const capabilityOptions = product.capabilities
    .filter((item) => !item.archivedAt)
    .map((item) => ({ value: item.id, label: item.name }));
  const componentOptions = product.components
    .filter((item) => !item.archivedAt)
    .map((item) => ({
      value: item.id,
      label: `${item.name} · ${linkedComponentIds.has(item.id) ? "linked to product" : "available in workspace"}`,
    }));
  const regions = product.screens.flatMap((screen) =>
    screen.regions.map((region) => ({
      value: region.id,
      label: `${screen.label ?? "Screen"} · ${region.label ?? "Region"}`,
    })),
  );
  const fields: FormField[] =
    adding === "region"
      ? [
          {
            name: "capabilityId",
            label: "Capability",
            type: "select",
            required: true,
            options: capabilityOptions,
          },
          {
            name: "regionId",
            label: "Visual region",
            type: "select",
            required: true,
            options: regions,
          },
        ]
      : [
          ...(adding === "capability"
            ? [
                {
                  name: "capabilityId",
                  label: "Capability",
                  type: "select" as const,
                  required: true,
                  options: capabilityOptions,
                },
                {
                  name: "componentId",
                  label: "Component",
                  type: "select" as const,
                  required: true,
                  options: componentOptions,
                  helper: "Reuse a linked or available workspace component.",
                },
              ]
            : [
                {
                  name: "consumerId",
                  label: "Consumer",
                  type: "select" as const,
                  required: true,
                  options: componentOptions,
                  helper: "Components are shared within this workspace.",
                },
                {
                  name: "providerId",
                  label: "Provider",
                  type: "select" as const,
                  required: true,
                  options: componentOptions,
                },
              ]),
          {
            name: "relation",
            label: "Relationship",
            required: true,
            helper: "e.g. calls, consumes, reads, requires",
          },
          {
            name: "description",
            label: "Contract or purpose",
            type: "textarea",
          },
          {
            name: "required",
            label: "Required for this capability or consumer",
            type: "checkbox",
          },
        ];
  const name = (id: string) =>
    product.components.find((item) => item.id === id)?.name ?? id;
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" flexWrap="wrap">
        <Typography variant="h6">Connections</Typography>
        {editable && (
          <Stack direction="row" flexWrap="wrap">
            <Button onClick={() => setAdding("capability")}>
              Link capability
            </Button>
            <Button onClick={() => setAdding("dependency")}>
              Link components
            </Button>
            <Button onClick={() => setAdding("region")}>Link region</Button>
          </Stack>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Declared product wiring provides dependency context. Only required
        acceptance checks determine release readiness.
      </Typography>
      {product.capabilityComponents
        .filter((link) => capabilityIds.has(link.capabilityId))
        .map((link) => (
          <Paper key={`${link.capabilityId}-${link.componentId}`} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">
                {
                  product.capabilities.find(
                    (item) => item.id === link.capabilityId,
                  )?.name
                }{" "}
                → {link.relation} → {name(link.componentId)} ·{" "}
                {link.required ? "Required dependency" : "Supporting context"}
                <br />
                {link.description}
              </Typography>
              {editable && (
                <Button
                  size="small"
                  onClick={() =>
                    void mutate({
                      type: "capability_component.delete",
                      data: {
                        capabilityId: link.capabilityId,
                        componentId: link.componentId,
                      },
                    }).catch(() => {})
                  }
                >
                  Unlink
                </Button>
              )}
            </Stack>
          </Paper>
        ))}
      {product.dependencies
        .filter(
          (link) =>
            linkedComponentIds.has(link.consumerId) &&
            linkedComponentIds.has(link.providerId),
        )
        .map((link) => (
          <Paper key={link.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">
                {name(link.consumerId)} → {link.relation} →{" "}
                {name(link.providerId)} ·{" "}
                {link.required ? "Required dependency" : "Supporting context"}
                <br />
                {link.description}
              </Typography>
              {editable && (
                <Button
                  size="small"
                  onClick={() =>
                    void mutate({
                      type: "dependency.delete",
                      id: link.id,
                      data: {},
                    }).catch(() => {})
                  }
                >
                  Unlink
                </Button>
              )}
            </Stack>
          </Paper>
        ))}
      {product.regionCapabilities
        .filter((link) => capabilityIds.has(link.capabilityId))
        .map((link) => (
          <Paper key={`${link.regionId}-${link.capabilityId}`} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">
                {
                  product.capabilities.find(
                    (item) => item.id === link.capabilityId,
                  )?.name
                }{" "}
                →{" "}
                {regions.find((item) => item.value === link.regionId)?.label ??
                  "Archived region"}
              </Typography>
              {editable && (
                <Button
                  size="small"
                  onClick={() =>
                    void mutate({
                      type: "region_capability.delete",
                      data: {
                        regionId: link.regionId,
                        capabilityId: link.capabilityId,
                      },
                    }).catch(() => {})
                  }
                >
                  Unlink
                </Button>
              )}
            </Stack>
          </Paper>
        ))}
      <Dialog
        open={adding !== null}
        onClose={() => setAdding(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {adding === "region"
            ? "Link a visual region"
            : adding === "capability"
              ? "Link a capability to a component"
              : "Connect components"}
        </DialogTitle>
        <DialogContent>
          {adding && (
            <MutationForm
              key={adding}
              fields={fields}
              initial={{ required: true }}
              submitLabel="Save connection"
              onCancel={() => setAdding(null)}
              onSubmit={async (data) => {
                await mutate({
                  type:
                    adding === "capability"
                      ? "capability_component.put"
                      : adding === "region"
                        ? "region_capability.put"
                        : "dependency.create",
                  data,
                });
                setAdding(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
