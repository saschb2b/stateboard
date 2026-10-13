"use client";
import { useTranslations } from "next-intl";

import { useId, useState } from "react";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  API_KEY_EXPIRY_PRESETS,
  DEFAULT_API_KEY_EXPIRY_DAYS,
  WORKSPACE_ROLES,
  meetsRole,
  type WorkspaceRole,
} from "@/lib/types";

export interface ApiKeyCreateInput {
  name: string;
  role: WorkspaceRole;
  expiresInDays: number | null;
}

interface ApiKeyCreateFormProps {
  viewerRole: WorkspaceRole;
  creating: boolean;
  /** Resolve true on success — the form then clears its name field. */
  onCreate: (input: ApiKeyCreateInput) => Promise<boolean>;
}

/** Name + role + expiry inputs for minting a key. Network stays with the caller. */
export function ApiKeyCreateForm({
  viewerRole,
  creating,
  onCreate,
}: ApiKeyCreateFormProps) {
  const t = useTranslations("Common");
  const fieldId = useId();
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(
    viewerRole === "owner" ? "editor" : viewerRole,
  );
  // "never" | number-of-days as string, for the Select.
  const [expiry, setExpiry] = useState(String(DEFAULT_API_KEY_EXPIRY_DAYS));

  // A key can't exceed its creator's role, so hide unreachable options.
  const roleOptions = WORKSPACE_ROLES.filter((r) => meetsRole(viewerRole, r));

  const submit = async () => {
    const created = await onCreate({
      name: name.trim(),
      role,
      expiresInDays: expiry === "never" ? null : Number(expiry),
    });
    if (created) setName("");
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
        {t("newKey")}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 2 }}
      >
        {t("keyHelp")}
      </Typography>
      <Stack
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "minmax(0, 1fr) 140px 200px auto",
          },
          gap: 1.5,
        }}
      >
        <TextField
          size="small"
          label={t("keyName")}
          disabled={creating}
          placeholder={t("keyPlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && !creating) void submit();
          }}
          sx={{ minWidth: 0 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }} disabled={creating}>
          <InputLabel id={`${fieldId}-role`}>{t("keyRole")}</InputLabel>
          <Select
            labelId={`${fieldId}-role`}
            label={t("keyRole")}
            size="small"
            value={role}
            disabled={creating}
            inputProps={{ "aria-label": t("keyRole") }}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            sx={{ minWidth: 120, textTransform: "capitalize" }}
          >
            {roleOptions.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                {t(`roles.${r}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }} disabled={creating}>
          <InputLabel id={`${fieldId}-expiry`}>{t("keyExpiry")}</InputLabel>
          <Select
            labelId={`${fieldId}-expiry`}
            label={t("keyExpiry")}
            size="small"
            value={expiry}
            disabled={creating}
            inputProps={{ "aria-label": t("keyExpiry") }}
            onChange={(e) => setExpiry(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {API_KEY_EXPIRY_PRESETS.map((days) => (
              <MenuItem key={days} value={String(days)}>
                {days === 365 ? t("year") : t("days", { count: days })}
              </MenuItem>
            ))}
            <MenuItem value="never">{t("noExpiration")}</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={submit}
          disabled={creating || !name.trim()}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {t("createKey")}
        </Button>
      </Stack>
    </Paper>
  );
}
