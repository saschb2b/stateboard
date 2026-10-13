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
  const t = useTranslations("Product");
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
      label: t(
        linkedComponentIds.has(item.id)
          ? "linkedComponentOption"
          : "availableComponentOption",
        { name: item.name },
      ),
    }));
  const regions = product.screens.flatMap((screen) =>
    screen.regions.map((region) => ({
      value: region.id,
      label: `${screen.label ?? t("screen")} · ${region.label ?? t("region")}`,
    })),
  );
  const fields: FormField[] =
    adding === "region"
      ? [
          {
            name: "capabilityId",
            label: t("capability"),
            type: "select",
            required: true,
            options: capabilityOptions,
          },
          {
            name: "regionId",
            label: t("visualRegion"),
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
                  label: t("capability"),
                  type: "select" as const,
                  required: true,
                  options: capabilityOptions,
                },
                {
                  name: "componentId",
                  label: t("component"),
                  type: "select" as const,
                  required: true,
                  options: componentOptions,
                  helper: t("reuseComponent"),
                },
              ]
            : [
                {
                  name: "consumerId",
                  label: t("consumer"),
                  type: "select" as const,
                  required: true,
                  options: componentOptions,
                  helper: t("sharedInWorkspace"),
                },
                {
                  name: "providerId",
                  label: t("provider"),
                  type: "select" as const,
                  required: true,
                  options: componentOptions,
                },
              ]),
          {
            name: "relation",
            label: t("relationship"),
            required: true,
            helper: t("relationshipHelp"),
          },
          {
            name: "description",
            label: t("contractPurpose"),
            type: "textarea",
          },
          {
            name: "required",
            label: t("requiredForConsumer"),
            type: "checkbox",
          },
        ];
  const name = (id: string) =>
    product.components.find((item) => item.id === id)?.name ?? id;
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" flexWrap="wrap">
        <Typography variant="h6">{t("connections")}</Typography>
        {editable && (
          <Stack direction="row" flexWrap="wrap">
            <Button onClick={() => setAdding("capability")}>
              {t("linkCapability")}
            </Button>
            <Button onClick={() => setAdding("dependency")}>
              {t("linkComponents")}
            </Button>
            <Button onClick={() => setAdding("region")}>
              {t("linkRegion")}
            </Button>
          </Stack>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t("connectionsHelp")}
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
                {link.required
                  ? t("requiredDependency")
                  : t("supportingContext")}
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
                  {t("unlink")}
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
                {link.required
                  ? t("requiredDependency")
                  : t("supportingContext")}
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
                  {t("unlink")}
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
                  t("archivedRegion")}
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
                  {t("unlink")}
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
            ? t("linkVisualRegion")
            : adding === "capability"
              ? t("linkCapabilityComponent")
              : t("connectComponents")}
        </DialogTitle>
        <DialogContent>
          {adding && (
            <MutationForm
              key={adding}
              fields={fields}
              initial={{ required: true }}
              submitLabel={t("saveConnection")}
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
