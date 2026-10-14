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
import type {
  Capability,
  ProductContext,
  ProductMutation,
} from "@/lib/release-types";
import { FeatureSupport } from "./feature-support";

export function CapabilityManager({
  product,
  editable,
  mutate,
  ownerLabel = "",
}: {
  product: ProductContext;
  editable: boolean;
  mutate: (mutation: ProductMutation) => Promise<void>;
  ownerLabel?: string;
}) {
  const t = useTranslations("Product");
  const fields: FormField[] = [
    {
      name: "name",
      label: t("capabilityName"),
      required: true,
      helper: t("capabilityNameHelp"),
    },
    {
      name: "outcome",
      label: t("expectedOutcome"),
      required: true,
      type: "textarea",
    },
    { name: "ownerLabel", label: t("accountableOwner"), required: true },
  ];
  const [editing, setEditing] = useState<Capability | "new" | null>(null);
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{t("productCapabilities")}</Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>
            {t("addCapability")}
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t("capabilityExplained")}
      </Typography>
      {product.capabilities
        .filter((item) => item.archivedAt === null)
        .map((item) => (
          <Paper key={item.id} sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={1}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Typography variant="body2">{item.outcome}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("ownerDefinition", {
                    owner: item.ownerLabel,
                    revision: item.definitionRevision,
                  })}
                </Typography>
                {item.ownerNeedsReassignment && (
                  <Typography variant="body2" color="warning.main">
                    {t("ownerMembershipEnded")}
                  </Typography>
                )}
              </Stack>
              {editable && (
                <Stack direction="row">
                  <Button size="small" onClick={() => setEditing(item)}>
                    {t("edit")}
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
                    {t("archive")}
                  </Button>
                </Stack>
              )}
            </Stack>
            <FeatureSupport
              capability={item}
              product={product}
              editable={editable}
              mutate={mutate}
            />
          </Paper>
        ))}
      {product.capabilities.filter((item) => item.archivedAt === null)
        .length === 0 && (
        <Typography color="text.secondary">
          {t("capabilityStartHelp")}
        </Typography>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing === "new" ? t("addCapability") : t("editCapability")}
        </DialogTitle>
        <DialogContent>
          {editing && (
            <MutationForm
              key={typeof editing === "string" ? editing : editing.id}
              fields={fields}
              initial={
                typeof editing === "string"
                  ? { ownerLabel }
                  : {
                      name: editing.name,
                      outcome: editing.outcome,
                      ownerLabel: editing.ownerLabel,
                    }
              }
              submitLabel={t("saveCapability")}
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
