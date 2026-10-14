"use client";

import { useTranslations } from "next-intl";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { Screen, ScreenWithRegions } from "@/lib/types";
import { clientRequest } from "@/lib/client-request";

interface ScreenUploaderProps {
  boardId: string;
  onUploaded: (screen: ScreenWithRegions) => void;
  /** When true, renders a smaller in-line button rather than the dropzone. */
  compact?: boolean;
  onPendingChange?: (pending: boolean) => void;
  /**
   * When set, the upload replaces this screen's image (keeping its regions)
   * instead of creating a new screen. The response already carries the
   * preserved regions, so it is passed straight through.
   */
  replaceScreenId?: string;
}

export function ScreenUploader({
  boardId,
  onUploaded,
  compact = false,
  replaceScreenId,
  onPendingChange,
}: ScreenUploaderProps) {
  const upload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const data = await clientRequest<Screen | ScreenWithRegions>(
      replaceScreenId
        ? `/api/screens/${replaceScreenId}/image`
        : `/api/boards/${boardId}/screens`,
      { method: replaceScreenId ? "PUT" : "POST", body: form },
    );
    const screen: ScreenWithRegions = replaceScreenId
      ? (data as ScreenWithRegions)
      : { ...(data as Screen), regions: [] };
    onUploaded(screen);
  };

  return (
    <ScreenUploadControl
      compact={compact}
      onUpload={upload}
      onPendingChange={onPendingChange}
    />
  );
}

export function ScreenUploadControl({
  compact = false,
  onUpload,
  onPendingChange,
}: {
  compact?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const t = useTranslations("Visual");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInFlight = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    if (uploadInFlight.current) return;
    uploadInFlight.current = true;
    setError(null);
    setUploading(true);
    onPendingChange?.(true);
    try {
      await onUpload(file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("uploadError"));
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
      onPendingChange?.(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  };

  if (compact) {
    return (
      <>
        <Button
          startIcon={
            uploading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <UploadFileIcon />
            )
          }
          variant="outlined"
          size="small"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t("uploading") : t("addScreen")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onPick}
          aria-label={t("screenshotFile")}
          disabled={uploading}
          hidden
        />
        {error ? (
          <Typography
            role="alert"
            variant="caption"
            color="error"
            sx={{ ml: 1 }}
          >
            {error}
          </Typography>
        ) : null}
      </>
    );
  }

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      sx={{
        position: "relative",
        p: 6,
        textAlign: "center",
        border: "2px dashed",
        borderColor: dragOver ? "primary.main" : "divider",
        borderRadius: 2,
        bgcolor: dragOver ? "action.hover" : "background.paper",
        transition: "all 120ms ease",
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <UploadFileIcon sx={{ fontSize: 36, color: "primary.main" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t("dropScreenshot")}
        </Typography>
        <Button
          variant="outlined"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {t("chooseScreenshot")}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t("screenshotFormats")}
        </Typography>
        {uploading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="caption">{t("uploading")}</Typography>
          </Stack>
        ) : null}
        {error ? (
          <Typography role="alert" variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onPick}
        aria-label={t("screenshotFile")}
        disabled={uploading}
        hidden
      />
    </Box>
  );
}
