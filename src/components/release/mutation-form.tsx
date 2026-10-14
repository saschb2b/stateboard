"use client";

import { useTranslations } from "next-intl";

import { useContext, useEffect, useRef, useState } from "react";
import { WorkspaceDrafts } from "./workspace-drafts";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export interface FormField {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "checkbox"
    | "select"
    | "multi"
    | "datetime-local";
  required?: boolean;
  helper?: string;
  options?: { value: string; label: string }[];
}
export type FormValues = Record<string, string | number | boolean | string[]>;

/** Prop-driven forms keep validation and errors visible without optimistic writes. */
export function MutationForm({
  fields,
  initial = {},
  submitLabel,
  onSubmit,
  onCancel,
  details,
  onValuesChange,
}: {
  fields: FormField[];
  initial?: FormValues;
  submitLabel: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
  details?: {
    label: string;
    fields: FormField[];
    summary?: (values: FormValues) => string;
  };
  onValuesChange?: (values: FormValues, field: string) => FormValues;
}) {
  const t = useTranslations("Release");
  const drafts = useContext(WorkspaceDrafts);
  useEffect(() => drafts?.register(), [drafts]);
  const allFields = [...fields, ...(details?.fields ?? [])];
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      allFields.map((field) => [
        field.name,
        initial[field.name] ??
          (field.type === "checkbox"
            ? false
            : field.type === "multi"
              ? []
              : ""),
      ]),
    ),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const change = (name: string, value: FormValues[string]) =>
    setValues((old) => {
      const next = { ...old, [name]: value };
      return onValuesChange?.(next, name) ?? next;
    });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = { ...values };
      for (const field of allFields) {
        const value = values[field.name];
        if (
          field.required &&
          (value === "" || (Array.isArray(value) && value.length === 0))
        ) {
          if (details?.fields.some((item) => item.name === field.name))
            setDetailsOpen(true);
          requestAnimationFrame(() => {
            const input = formRef.current?.elements.namedItem(field.name);
            if (input instanceof HTMLElement) input.focus();
          });
          throw new Error(t("mutation.required", { field: field.label }));
        }
        if (field.type === "number") result[field.name] = Number(value);
      }
      await onSubmit(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("mutation.saveFailed"),
      );
    } finally {
      setPending(false);
    }
  }
  function renderFields(items: FormField[]) {
    return items.map((field) =>
      field.type === "checkbox" ? (
        <FormControlLabel
          key={field.name}
          label={field.label}
          control={
            <Checkbox
              checked={Boolean(values[field.name])}
              disabled={pending}
              onChange={(event) => change(field.name, event.target.checked)}
            />
          }
        />
      ) : field.type === "multi" ? (
        <Stack key={field.name} spacing={0.25}>
          <Typography variant="subtitle2">{field.label}</Typography>
          {field.options?.map((option) => (
            <FormControlLabel
              key={option.value}
              label={option.label}
              control={
                <Checkbox
                  disabled={pending}
                  checked={
                    Array.isArray(values[field.name]) &&
                    (values[field.name] as string[]).includes(option.value)
                  }
                  onChange={(event) => {
                    const selected = (values[field.name] as string[]) ?? [];
                    change(
                      field.name,
                      event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((value) => value !== option.value),
                    );
                  }}
                />
              }
            />
          ))}
          {field.helper && (
            <Typography variant="caption" color="text.secondary">
              {field.helper}
            </Typography>
          )}
        </Stack>
      ) : (
        <TextField
          key={field.name}
          name={field.name}
          label={field.label}
          value={values[field.name] ?? ""}
          onChange={(event) => change(field.name, event.target.value)}
          required={field.required}
          disabled={pending}
          fullWidth
          size="small"
          multiline={field.type === "textarea"}
          minRows={field.type === "textarea" ? 2 : undefined}
          type={
            field.type === "number" || field.type === "datetime-local"
              ? field.type
              : "text"
          }
          slotProps={
            field.type === "datetime-local"
              ? { inputLabel: { shrink: true } }
              : undefined
          }
          select={field.type === "select"}
          helperText={field.helper}
        >
          {field.options?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ),
    );
  }
  return (
    <Stack
      component="form"
      ref={formRef}
      noValidate
      onSubmit={submit}
      spacing={2}
      sx={{ py: 1 }}
    >
      {renderFields(fields)}
      {details && (
        <Box
          component="details"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <Box
            component="summary"
            sx={{ cursor: "pointer", typography: "body2", py: 0.5 }}
          >
            {details.label}
            {details.summary && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                {details.summary(values)}
              </Typography>
            )}
          </Box>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {renderFields(details.fields)}
          </Stack>
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? t("mutation.saving") : submitLabel}
        </Button>
        {onCancel && (
          <Button disabled={pending} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
