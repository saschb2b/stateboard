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
              Reviewed {new Date(projection.reviewedAt).toISOString()}
            </Typography>
            {projection.validUntil != null && (
              <Typography variant="caption" color="text.secondary">
                Recorded evidence freshness limit:{" "}
                {new Date(projection.validUntil).toISOString()}
              </Typography>
            )}
          </Stack>
          <Alert severity="info">
            This link presents a recorded review. Its result reflects the
            evidence at the time of that decision.
          </Alert>
          <Paper sx={{ p: 3 }}>
            <Typography>{projection.summary}</Typography>
          </Paper>
          {projection.capabilities.map((item, index) => (
            <Paper key={index} sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Typography variant="h6">{item.name}</Typography>
                  <ReadinessChip state={item.state} />
                </Stack>
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
