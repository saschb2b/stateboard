"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

interface ApiKeyRevealProps {
  /** The plaintext secret — exists in the browser exactly once, here. */
  secret: string;
}

/** Show-once panel for a freshly minted key, with copy-to-clipboard. */
export function ApiKeyReveal({ secret }: ApiKeyRevealProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  };

  return (
    <Paper sx={{ p: 2.5, borderColor: "primary.main" }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Copy your key now — it won&apos;t be shown again
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="code"
          sx={{
            flex: 1,
            p: 1,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            fontSize: 13,
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {secret}
        </Box>
        <Tooltip title={copied ? "Copied" : "Copy to clipboard"}>
          <IconButton size="small" onClick={onCopy} aria-label="Copy API key">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
