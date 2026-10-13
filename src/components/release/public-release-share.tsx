"use client";

import {
  Alert,
  Box,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { AppHeader } from "@/components/app/app-header";
import { ReadinessChip } from "./readiness-summary";
import type { PublicReleaseProjection } from "@/lib/release-types";

const reviewDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
  timeZoneName: "short",
});

function ReviewTime({ value }: { value: number }) {
  const exactTime = new Date(value).toISOString();
  return (
    <Box component="time" dateTime={exactTime} title={exactTime}>
      {reviewDateFormat.format(value)}
    </Box>
  );
}

/** The public renderer accepts only the curated projection, never private release data. */
export function PublicReleaseShare({
  projection,
  token,
}: {
  projection: PublicReleaseProjection;
  token: string;
}) {
  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="overline" color="primary">
              Recorded release review
            </Typography>
            <Typography variant="h3">{projection.candidateLabel}</Typography>
            <Typography color="text.secondary">
              {projection.targetEnvironment} · {projection.audience}
            </Typography>
            <Stack direction="row" gap={1}>
              <Chip
                label={
                  projection.decision === "approved"
                    ? "Approved release"
                    : "Held release"
                }
                color={
                  projection.decision === "approved" ? "success" : "warning"
                }
              />
              <ReadinessChip state={projection.readiness} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Reviewed <ReviewTime value={projection.reviewedAt} />
            </Typography>
            {projection.validUntil != null && (
              <Typography variant="caption" color="text.secondary">
                Evidence valid until{" "}
                <ReviewTime value={projection.validUntil} />
              </Typography>
            )}
          </Stack>
          <Alert severity="info">
            This is a saved review. It does not update as evidence changes or
            expires.
          </Alert>
          <Paper sx={{ p: 3 }}>
            <Typography>{projection.summary}</Typography>
          </Paper>
          {projection.capabilities.map((item, index) => (
            <Paper key={index} sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Typography variant="h6">{item.name}</Typography>
                  <ReadinessChip state={item.state} verification />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Check verification at this review; availability requires
                  deployment verification.
                </Typography>
                <Typography>{item.outcome}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.explanation}
                </Typography>
              </Stack>
            </Paper>
          ))}
          {projection.images.map((asset) => (
            <Paper key={asset.assetId} sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {asset.label}
              </Typography>
              <Box
                component="img"
                src={`/api/release-share-links/${token}/assets/${asset.assetId}`}
                alt={asset.label}
                width={asset.width}
                height={asset.height}
                sx={{ width: "100%", height: "auto", display: "block" }}
              />
            </Paper>
          ))}
        </Stack>
      </Container>
    </>
  );
}
