"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
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
  const t = useTranslations("Release");
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
              cause instanceof Error ? cause.message : t("history.loadFailed"),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {t("history.definitions")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("history.definitions")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {pending && <Typography>{t("history.loading")}</Typography>}
            {error && <Alert severity="error">{error}</Alert>}
            {revisions.map((revision) => (
              <Paper key={revision.revision} sx={{ p: 2 }}>
                <Typography variant="subtitle2">
                  {t("history.revision", {
                    revision: revision.revision,
                    requirement: revision.required
                      ? t("common.required")
                      : t("common.optional"),
                  })}
                </Typography>
                <Typography>{revision.claim}</Typography>
                <Typography variant="body2">{revision.method}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("history.context", {
                    category: t(`categories.${revision.category}`),
                    owner: revision.ownerLabel,
                    environment: revision.environment,
                    hours: revision.maxAgeMs / 3_600_000,
                  })}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("common.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
