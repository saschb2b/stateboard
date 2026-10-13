"use client";

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
        New key
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 2 }}
      >
        Use a name that identifies the agent or workflow. Editor keys can
        maintain boards; viewer keys can read them.
      </Typography>
      <Stack
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "minmax(0, 1fr) 120px 140px auto",
          },
          gap: 1.5,
        }}
      >
        <TextField
          size="small"
          label="Key name"
          disabled={creating}
          placeholder="e.g. release-bot"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && !creating) void submit();
          }}
          sx={{ minWidth: 0 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }} disabled={creating}>
          <InputLabel id={`${fieldId}-role`}>Key role</InputLabel>
          <Select
            labelId={`${fieldId}-role`}
            label="Key role"
            size="small"
            value={role}
            disabled={creating}
            inputProps={{ "aria-label": "Key role" }}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            sx={{ minWidth: 120, textTransform: "capitalize" }}
          >
            {roleOptions.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }} disabled={creating}>
          <InputLabel id={`${fieldId}-expiry`}>Key expiration</InputLabel>
          <Select
            labelId={`${fieldId}-expiry`}
            label="Key expiration"
            size="small"
            value={expiry}
            disabled={creating}
            inputProps={{ "aria-label": "Key expiration" }}
            onChange={(e) => setExpiry(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {API_KEY_EXPIRY_PRESETS.map((days) => (
              <MenuItem key={days} value={String(days)}>
                {days === 365 ? "1 year" : `${days} days`}
              </MenuItem>
            ))}
            <MenuItem value="never">No expiration</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={submit}
          disabled={creating || !name.trim()}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          Create key
        </Button>
      </Stack>
    </Paper>
  );
}
