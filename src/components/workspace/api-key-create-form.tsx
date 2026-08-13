"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
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
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        New key
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          size="small"
          placeholder="e.g. release-bot"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="Shown in this list and in the audit log."
          sx={{ flex: 1 }}
        />
        <Select
          size="small"
          value={role}
          onChange={(e) => setRole(e.target.value as WorkspaceRole)}
          sx={{ minWidth: 120, textTransform: "capitalize" }}
        >
          {roleOptions.map((r) => (
            <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
              {r}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={expiry}
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
        <Button
          variant="contained"
          onClick={submit}
          disabled={creating || !name.trim()}
        >
          Create key
        </Button>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1 }}
      >
        Viewer keys can read boards; editor keys can also change regions,
        screens, and share links. Expired keys stop working on their own.
      </Typography>
    </Paper>
  );
}
