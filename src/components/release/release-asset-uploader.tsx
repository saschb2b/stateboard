"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ReleaseAsset } from "@/lib/release-types";

export function ReleaseAssetUploader({
  assets,
  upload,
}: {
  assets: ReleaseAsset[];
  upload: (file: File, label: string) => Promise<void>;
}) {
  const t = useTranslations("Release");
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Box
      component="details"
      sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}
    >
      <Typography
        component="summary"
        variant="body2"
        sx={{ cursor: "pointer", width: "fit-content" }}
      >
        {t("assets.title")}
        {assets.length > 0 ? ` · ${assets.length}` : ""}
      </Typography>
      <Stack spacing={2} sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t("assets.privateHelp")}
        </Typography>
        <Stack
          component="form"
          direction={{ xs: "column", sm: "row" }}
          gap={1}
          onSubmit={async (event) => {
            event.preventDefault();
            if (!file || pending) return;
            setPending(true);
            setError(null);
            try {
              await upload(file, label || file.name);
              setFile(null);
              setLabel("");
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : t("assets.failed"),
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <Button component="label" variant="outlined" disabled={pending}>
            {file?.name ?? t("assets.choose")}
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Button>
          <TextField
            size="small"
            label={t("assets.label")}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={pending}
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained" disabled={!file || pending}>
            {pending ? t("assets.uploading") : t("assets.upload")}
          </Button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {assets.map((asset) => (
          <Typography key={asset.id} variant="caption">
            {t("assets.size", {
              label: asset.label,
              size: Math.ceil(asset.sizeBytes / 1024),
            })}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}
