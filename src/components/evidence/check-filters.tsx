"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
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
          aria-label="Check coverage"
          size="small"
          disabled={disabled}
          onChange={(_, value: string | null) => {
            if (value) onChange({ needsAttention: value === "attention" });
          }}
        >
          <ToggleButton value="all">All ({total})</ToggleButton>
          <ToggleButton value="attention">
            Needs attention ({requiredAttention + optionalWarnings})
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label="Search claims or owners"
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
          {expanded ? "Hide filters" : "More filters"}
        </Button>
      </Stack>
      <Collapse in={expanded}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
          <TextField
            select
            label="Result"
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
            <MenuItem value="all">All results</MenuItem>
            {[
              "pass",
              "fail",
              "missing",
              "stale",
              "inconclusive",
              "not_evaluated",
            ].map((state) => (
              <MenuItem key={state} value={state}>
                {state === "not_evaluated" ? "Not evaluated" : state}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
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
            <MenuItem value="all">All categories</MenuItem>
            {CHECK_CATEGORIES.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Collapse>
      {operationsOnly && (
        <Stack>
          <FormControlLabel
            label="Include functional checks"
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
          {shown} {shown === 1 ? "check" : "checks"}
          {filters.needsAttention &&
            ` · ${requiredAttention} required · ${optionalWarnings} optional`}
        </Typography>
        {!disabled && changed && (
          <Button size="small" onClick={onReset}>
            Reset filters
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
