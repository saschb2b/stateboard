"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { Screen, ScreenWithRegions } from "@/lib/types";

interface ScreenUploaderProps {
  boardId: string;
  onUploaded: (screen: ScreenWithRegions) => void;
  /** When true, renders a smaller in-line button rather than the dropzone. */
  compact?: boolean;
}

export function ScreenUploader({
  boardId,
  onUploaded,
  compact = false,
}: ScreenUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/boards/${boardId}/screens`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `upload failed (${res.status})`);
        return;
      }
      const screen: Screen = await res.json();
      onUploaded({ ...screen, regions: [] });
    } finally {
      setUploading(false);
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
          {uploading ? "Uploading…" : "Add screen"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onPick}
          hidden
        />
        {error ? (
          <Typography variant="caption" color="error" sx={{ ml: 1 }}>
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
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      sx={{
        position: "relative",
        p: 6,
        textAlign: "center",
        border: "2px dashed",
        borderColor: dragOver ? "primary.main" : "divider",
        borderRadius: 2,
        bgcolor: dragOver ? "action.hover" : "background.paper",
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <UploadFileIcon sx={{ fontSize: 36, color: "primary.main" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Drop a screenshot here, or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary">
          PNG, JPEG, WebP, or GIF — up to 25 MB
        </Typography>
        {uploading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="caption">Uploading…</Typography>
          </Stack>
        ) : null}
        {error ? (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onPick}
        hidden
      />
    </Box>
  );
}
