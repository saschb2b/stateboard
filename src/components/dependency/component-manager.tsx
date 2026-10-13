"use client";

import { useLocale, useTranslations } from "next-intl";

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

export function ComponentManager({
  product,
  editable,
  mutate,
}: {
  product: ProductContext;
  editable: boolean;
  mutate: (mutation: ProductMutation) => Promise<void>;
}) {
  const t = useTranslations("Product");
  const locale = useLocale();
  const fields: FormField[] = [
    { name: "name", label: t("componentName"), required: true },
    {
      name: "kind",
      label: t("kind"),
      type: "select",
      required: true,
      options: COMPONENT_KINDS.map((value) => ({
        value,
        label: t(`kinds.${value}`),
      })),
    },
    { name: "ownerLabel", label: t("accountableOwner"), required: true },
    { name: "description", label: t("purpose"), type: "textarea" },
    {
      name: "referenceUrl",
      label: t("referenceLink"),
      helper: t("referenceLinkHelp"),
    },
  ];
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
      .toLocaleLowerCase(locale)
      .includes(search.trim().toLocaleLowerCase(locale)),
  );
  const linkFields: FormField[] = [
    {
      name: "capabilityId",
      label: t("capability"),
      type: "select",
      required: true,
      options: product.capabilities
        .filter((item) => item.archivedAt === null)
        .map((item) => ({ value: item.id, label: item.name })),
    },
    {
      name: "relation",
      label: t("relationship"),
      required: true,
      helper: t("relationshipHelp"),
    },
    { name: "description", label: t("contractPurpose"), type: "textarea" },
    {
      name: "required",
      label: t("requiredForCapability"),
      type: "checkbox",
    },
  ];
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h6">{t("dependenciesOwners")}</Typography>
        {editable && (
          <Button onClick={() => setEditing("new")}>{t("addComponent")}</Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t("componentAvailability", {
          linked: linked.length,
          available: available.length,
        })}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button
          onClick={() => {
            setBrowseWorkspace(!browseWorkspace);
            setSearch("");
          }}
        >
          {browseWorkspace ? t("showLinkedComponents") : t("browseComponents")}
        </Button>
        <TextField
          size="small"
          label={
            browseWorkspace
              ? t("searchWorkspaceComponents")
              : t("searchLinkedComponents")
          }
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>
      {browseWorkspace && (
        <Typography variant="body2" color="text.secondary">
          {t("sharedComponentHelp")}
        </Typography>
      )}
      {focus.truncated && (
        <Typography variant="body2" color="warning.main">
          {t("componentLimit")}
        </Typography>
      )}
      {shown.length === 0 && (
        <Typography color="text.secondary">
          {search ? t("noMatchingComponents") : t("noLinkedComponents")}
        </Typography>
      )}
      {shown.map((item) => (
        <Paper key={item.id} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Chip size="small" label={t(`kinds.${item.kind}`)} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    linkedIds.has(item.id)
                      ? t("linkedToProduct")
                      : t("availableToLink")
                  }
                />
              </Stack>
              <Typography variant="body2">{item.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                {item.ownerLabel}
              </Typography>
              {item.ownerNeedsReassignment && (
                <Typography variant="body2" color="warning.main">
                  {t("ownerMembershipEnded")}
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
                  {t("openReference")}
                </Button>
              )}
            </Stack>
            {editable && (
              <Stack direction="row" flexWrap="wrap" alignContent="start">
                {!linkedIds.has(item.id) && (
                  <Button size="small" onClick={() => setLinking(item)}>
                    {t("linkToCapability")}
                  </Button>
                )}
                <Button size="small" onClick={() => setEditing(item)}>
                  {t("edit")}
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
                  {t("archive")}
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
        <DialogTitle>
          {t("linkComponentTitle", { name: linking?.name ?? "" })}
        </DialogTitle>
        <DialogContent>
          {linking && (
            <MutationForm
              key={linking.id}
              fields={linkFields}
              initial={{ required: true }}
              submitLabel={t("saveConnection")}
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
          {editing === "new" ? t("addComponent") : t("editComponent")}
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
              submitLabel={t("saveComponent")}
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
