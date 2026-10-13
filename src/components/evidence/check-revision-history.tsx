"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReleaseCheck } from "@/lib/release-types";

export function CheckRevisionHistory({
  check,
  load,
}: {
  check: ReleaseCheck;
  load?: () => Promise<ReleaseCheck[]>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [revisions, setRevisions] = useState<ReleaseCheck[]>([check]);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        size="small"
        onClick={async () => {
          setOpen(true);
          if (!load) return;
          setPending(true);
          setError(null);
          try {
            setRevisions(await load());
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Unable to load check history.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        Check definition history
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Check definition history</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {pending && <Typography>Loading definitions…</Typography>}
            {error && <Alert severity="error">{error}</Alert>}
            {revisions.map((revision) => (
              <Paper key={revision.revision} sx={{ p: 2 }}>
                <Typography variant="subtitle2">
                  Revision {revision.revision} ·{" "}
                  {revision.required ? "Required" : "Optional"}
                </Typography>
                <Typography>{revision.claim}</Typography>
                <Typography variant="body2">{revision.method}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {revision.category} · {revision.ownerLabel} ·{" "}
                  {revision.environment} · {revision.maxAgeMs / 3_600_000} hours
                </Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
