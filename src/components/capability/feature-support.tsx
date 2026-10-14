"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import {
  MutationForm,
  type FormField,
} from "@/components/release/mutation-form";
import type {
  Capability,
  ProductContext,
  ProductMutation,
} from "@/lib/release-types";

export function FeatureSupport({
  capability,
  product,
  editable,
  mutate,
}: {
  capability: Capability;
  product: ProductContext;
  editable: boolean;
  mutate: (mutation: ProductMutation) => Promise<void>;
}) {
  const t = useTranslations("Product");
  const release = useTranslations("Release");
  const [adding, setAdding] = useState<"system" | "screen" | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const systems = product.capabilityComponents.filter(
    (link) => link.capabilityId === capability.id,
  );
  const screenLinks = product.regionCapabilities.filter(
    (link) => link.capabilityId === capability.id,
  );
  const regions = product.screens.flatMap((screen) =>
    screen.regions.map((region) => ({
      value: region.id,
      label: `${screen.label ?? t("screen")} · ${region.label ?? t("region")}`,
    })),
  );
  const availableSystems = product.components
    .filter(
      (item) =>
        !item.archivedAt &&
        !systems.some((link) => link.componentId === item.id),
    )
    .map((item) => ({ value: item.id, label: item.name }));
  const availableRegions = regions.filter(
    (region) => !screenLinks.some((link) => link.regionId === region.value),
  );
  const fields: FormField[] = [
    adding === "screen"
      ? {
          name: "regionId",
          label: t("visualRegion"),
          type: "select",
          required: true,
          options: availableRegions,
        }
      : {
          name: "componentId",
          label: t("supportingSystem"),
          type: "select",
          required: true,
          options: availableSystems,
          helper: t("reuseComponent"),
        },
  ];
  const hasOptions =
    adding === "screen"
      ? availableRegions.length > 0
      : availableSystems.length > 0;

  async function remove(mutation: ProductMutation) {
    if (removing) return;
    setRemoving(true);
    setError(null);
    try {
      await mutate(mutation);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : release("mutation.saveFailed"),
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Box component="details" sx={{ mt: 1.5 }}>
        <Box
          component="summary"
          sx={{ cursor: "pointer", typography: "body2", py: 0.5 }}
        >
          {t("supportingDetails")}{" "}
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1 }}
          >
            {t("supportingCount", {
              systems: systems.length,
              screens: screenLinks.length,
            })}
          </Typography>
        </Box>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t("supportingHelp")}
          </Typography>
          {systems.map((link) => (
            <Stack
              key={link.componentId}
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              gap={1}
            >
              <Stack spacing={0.25}>
                <Typography variant="body2">
                  {product.components.find(
                    (item) => item.id === link.componentId,
                  )?.name ?? link.componentId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {link.relation} ·{" "}
                  {link.required
                    ? t("requiredDependency")
                    : t("supportingContext")}
                </Typography>
                {link.description && (
                  <Typography variant="body2" color="text.secondary">
                    {link.description}
                  </Typography>
                )}
              </Stack>
              {editable && (
                <IconButton
                  size="small"
                  disabled={removing}
                  title={t("unlink")}
                  aria-label={`${t("unlink")}: ${product.components.find((item) => item.id === link.componentId)?.name ?? link.componentId}`}
                  onClick={() =>
                    void remove({
                      type: "capability_component.delete",
                      data: {
                        capabilityId: capability.id,
                        componentId: link.componentId,
                      },
                    })
                  }
                >
                  <LinkOffOutlinedIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
          {screenLinks.map((link) => (
            <Stack
              key={link.regionId}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={1}
            >
              <Typography variant="body2">
                {regions.find((item) => item.value === link.regionId)?.label ??
                  t("archivedRegion")}
              </Typography>
              {editable && (
                <IconButton
                  size="small"
                  disabled={removing}
                  title={t("unlink")}
                  aria-label={`${t("unlink")}: ${regions.find((item) => item.value === link.regionId)?.label ?? t("archivedRegion")}`}
                  onClick={() =>
                    void remove({
                      type: "region_capability.delete",
                      data: {
                        capabilityId: capability.id,
                        regionId: link.regionId,
                      },
                    })
                  }
                >
                  <LinkOffOutlinedIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
          {error && <Alert severity="error">{error}</Alert>}
          {editable && (
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              <Button
                size="small"
                disabled={removing}
                onClick={() => setAdding("system")}
              >
                {t("addSupportingSystem")}
              </Button>
              <Button
                size="small"
                disabled={removing}
                onClick={() => setAdding("screen")}
              >
                {t("linkScreen")}
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>
      <Dialog
        open={adding !== null}
        onClose={() => setAdding(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {adding === "screen" ? t("linkScreen") : t("addSupportingSystem")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {t("supportingFor", { name: capability.name })}
          </Typography>
          {adding && hasOptions && (
            <MutationForm
              key={adding}
              fields={fields}
              initial={{
                relation: t("defaultFeatureRelation"),
                required: false,
              }}
              details={
                adding === "system"
                  ? {
                      label: t("relationshipDetails"),
                      fields: [
                        {
                          name: "description",
                          label: t("contractPurpose"),
                          type: "textarea",
                        },
                        {
                          name: "relation",
                          label: t("relationship"),
                          required: true,
                        },
                        {
                          name: "required",
                          label: t("requiredForConsumer"),
                          type: "checkbox",
                        },
                      ],
                    }
                  : undefined
              }
              submitLabel={t("saveConnection")}
              onCancel={() => setAdding(null)}
              onSubmit={async (data) => {
                await mutate({
                  type:
                    adding === "screen"
                      ? "region_capability.put"
                      : "capability_component.put",
                  data: { ...data, capabilityId: capability.id },
                });
                setAdding(null);
              }}
            />
          )}
          {adding && !hasOptions && (
            <Stack spacing={2}>
              <Typography variant="body2">
                {adding === "screen"
                  ? t("noRegionsAvailable")
                  : t("noSystemsAvailable")}
              </Typography>
              <Button
                onClick={() => setAdding(null)}
                sx={{ alignSelf: "flex-start" }}
              >
                {release("common.cancel")}
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
