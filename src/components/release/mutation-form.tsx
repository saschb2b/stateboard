"use client";

import { useState } from "react";
import {
  Alert,
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
}: {
  fields: FormField[];
  initial?: FormValues;
  submitLabel: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      fields.map((field) => [
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
  const change = (name: string, value: FormValues[string]) =>
    setValues((old) => ({ ...old, [name]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = { ...values };
      for (const field of fields) {
        if (field.type === "number")
          result[field.name] = Number(values[field.name]);
        const value = result[field.name];
        if (
          field.required &&
          (value === "" || (Array.isArray(value) && value.length === 0))
        )
          throw new Error(`${field.label} is required.`);
      }
      await onSubmit(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save. Try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Stack component="form" onSubmit={submit} spacing={2} sx={{ py: 1 }}>
      {fields.map((field) =>
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
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
