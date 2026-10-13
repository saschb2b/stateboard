"use client";

import { Box, Chip, Container, Paper, Stack, Typography } from "@mui/material";
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

/** Accept only the curated projection, never private release data. */
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
      <Container component="main" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Stack spacing={1.5} component="header">
            <Typography variant="overline" color="text.secondary">
              Recorded release review
            </Typography>
            <Typography
              variant="h4"
              component="h1"
              sx={{ overflowWrap: "anywhere" }}
            >
              {projection.candidateLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {projection.targetEnvironment} · {projection.audience}
            </Typography>
            <Stack direction="row" gap={1} sx={{ flexWrap: "wrap" }}>
              <Chip
                size="small"
                variant="outlined"
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
            <Typography sx={{ maxWidth: 680, whiteSpace: "pre-wrap" }}>
              {projection.summary}
            </Typography>
          </Stack>

          <Box
            sx={{
              py: 2,
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 4 }}
              sx={{ mb: 1 }}
            >
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
            <Typography variant="caption" color="text.secondary">
              This is a saved review. It does not update as evidence changes or
              expires.
            </Typography>
          </Box>

          {projection.capabilities.length > 0 && (
            <Paper component="section" aria-labelledby="review-outcomes">
              <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                <Typography
                  id="review-outcomes"
                  component="h2"
                  variant="subtitle1"
                  sx={{ mb: 0.5 }}
                >
                  Outcomes in this review
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Check verification at this review; availability requires
                  deployment verification.
                </Typography>
              </Box>
              {projection.capabilities.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    px: { xs: 2, sm: 3 },
                    py: 2,
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={1}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Typography
                        component="h3"
                        variant="subtitle2"
                        sx={{ overflowWrap: "anywhere", minWidth: 0 }}
                      >
                        {item.name}
                      </Typography>
                      <ReadinessChip state={item.state} verification />
                    </Stack>
                    <Typography variant="body2">{item.outcome}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.explanation}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Paper>
          )}
          {projection.images.length > 0 && (
            <Box component="section" aria-labelledby="review-images">
              <Typography
                id="review-images"
                component="h2"
                variant="subtitle1"
                sx={{ mb: 2 }}
              >
                Review images
              </Typography>
              <Stack spacing={2}>
                {projection.images.map((asset) => (
                  <Paper
                    component="figure"
                    key={asset.assetId}
                    sx={{ m: 0, overflow: "hidden" }}
                  >
                    <Box
                      component="img"
                      src={`/api/release-share-links/${token}/assets/${asset.assetId}`}
                      alt={asset.label}
                      width={asset.width}
                      height={asset.height}
                      sx={{ width: "100%", height: "auto", display: "block" }}
                    />
                    <Typography
                      component="figcaption"
                      variant="caption"
                      color="text.secondary"
                      sx={{ px: 2, py: 1.5 }}
                    >
                      {asset.label}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Container>
    </>
  );
}
