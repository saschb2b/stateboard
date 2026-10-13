"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { CHECK_CATEGORIES } from "@/lib/release-types";
import type { CheckFilters as CheckFilterValues } from "./check-scope";

export function CheckFilters({
  filters,
  onChange,
  onReset,
  total,
  shown,
  requiredAttention,
  optionalWarnings,
  operationsOnly = false,
  disabled = false,
}: {
  filters: CheckFilterValues;
  onChange: (patch: Partial<CheckFilterValues>) => void;
  onReset: () => void;
  total: number;
  shown: number;
  requiredAttention: number;
  optionalWarnings: number;
  operationsOnly?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("Release");
  const [expanded, setExpanded] = useState(false);
  const changed =
    filters.needsAttention ||
    filters.result !== "all" ||
    filters.category !== "all" ||
    filters.query;
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} gap={1.5}>
        <ToggleButtonGroup
          exclusive
          value={filters.needsAttention ? "attention" : "all"}
          aria-label={t("filters.coverage")}
          size="small"
          disabled={disabled}
          onChange={(_, value: string | null) => {
            if (value) onChange({ needsAttention: value === "attention" });
          }}
        >
          <ToggleButton value="all">
            {t("filters.all", { count: total })}
          </ToggleButton>
          <ToggleButton value="attention">
            {t("filters.attention", {
              count: requiredAttention + optionalWarnings,
            })}
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label={t("filters.search")}
          value={filters.query ?? ""}
          size="small"
          sx={{ flex: 1 }}
          disabled={disabled}
          onChange={(event) => onChange({ query: event.target.value })}
        />
        <Button
          size="small"
          disabled={disabled}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t("filters.hide") : t("filters.more")}
        </Button>
      </Stack>
      {filters.category && filters.category !== "all" && (
        <Stack direction="row">
          <Chip
            size="small"
            variant="outlined"
            label={t("filters.category", {
              category: t(`categories.${filters.category}`),
            })}
            aria-label={t("filters.clearCategory", {
              category: t(`categories.${filters.category}`),
            })}
            disabled={disabled}
            onClick={() => onChange({ category: "all" })}
            onDelete={() => onChange({ category: "all" })}
          />
        </Stack>
      )}
      <Collapse in={expanded}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
          <TextField
            select
            label={t("common.result")}
            value={filters.result ?? "all"}
            size="small"
            sx={{ minWidth: 170 }}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                result: event.target.value as CheckFilterValues["result"],
              })
            }
          >
            <MenuItem value="all">{t("filters.allResults")}</MenuItem>
            {(
              [
                "pass",
                "fail",
                "missing",
                "stale",
                "inconclusive",
                "not_evaluated",
              ] as const
            ).map((state) => (
              <MenuItem key={state} value={state}>
                {t(`filterResults.${state}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("common.category")}
            value={filters.category ?? "all"}
            size="small"
            sx={{ minWidth: 170 }}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                category: event.target.value as CheckFilterValues["category"],
              })
            }
          >
            <MenuItem value="all">{t("filters.allCategories")}</MenuItem>
            {CHECK_CATEGORIES.map((value) => (
              <MenuItem key={value} value={value}>
                {t(`categories.${value}`)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Collapse>
      {operationsOnly && (
        <Stack>
          <FormControlLabel
            label={t("filters.includeFunctional")}
            control={
              <Checkbox
                checked={filters.includeFunctional ?? false}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ includeFunctional: event.target.checked })
                }
              />
            }
          />
        </Stack>
      )}
      <Stack
        direction="row"
        justifyContent="space-between"
        gap={1}
        alignItems="center"
      >
        <Typography variant="caption" color="text.secondary">
          {t("filters.count", { count: shown })}
          {filters.needsAttention &&
            t("filters.requirements", {
              required: requiredAttention,
              optional: optionalWarnings,
            })}
        </Typography>
        {!disabled && changed && (
          <Button size="small" onClick={onReset}>
            {t("filters.reset")}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
