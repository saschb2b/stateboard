"use client";

import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { ProductContext } from "@/lib/release-types";
import { ReleaseOverviewSummary } from "./release-overview-summary";

export function ProductReleaseList({
  product,
  editable,
  onCreate,
  onSetup,
}: {
  product: ProductContext;
  editable: boolean;
  onCreate: () => void;
  onSetup: () => void;
}) {
  const [latest, ...history] = product.releases;
  const configured = product.capabilities.some(
    (item) => item.archivedAt === null,
  );
  const overview = (id: string) =>
    product.releaseOverviews?.find((item) => item.assessment.id === id);
  const href = (id: string) => `/boards/${product.board.id}/releases/${id}`;
  return (
    <Stack spacing={4}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle2" color="text.secondary">
            {latest ? "Latest release" : "Releases"}
          </Typography>
          {editable && latest && (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={!configured}
              onClick={onCreate}
            >
              New assessment
            </Button>
          )}
        </Stack>
        {latest ? (
          <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="h6" component="h2" sx={{ maxWidth: 760 }}>
              {latest.candidateLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Target · {latest.targetEnvironment}
            </Typography>
            <ReleaseOverviewSummary overview={overview(latest.id)} />
            <Button
              component={Link}
              href={href(latest.id)}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ mt: 1 }}
            >
              Review release
            </Button>
          </Paper>
        ) : (
          <Box sx={{ py: 5 }}>
            <Typography variant="h6">
              {configured ? "No releases yet" : "Define the first capability"}
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 0.5, mb: 2 }}
            >
              {configured
                ? "Choose a candidate to start reviewing its readiness."
                : "A capability describes what someone should be able to do."}
            </Typography>
            <Button
              variant="contained"
              onClick={editable && configured ? onCreate : onSetup}
            >
              {editable
                ? configured
                  ? "New assessment"
                  : "Add capabilities"
                : "View capabilities"}
            </Button>
            <Button component={Link} href="/share/demo/releases" sx={{ ml: 1 }}>
              See an example
            </Button>
          </Box>
        )}
      </Stack>
      {history.length > 0 && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            Earlier releases
          </Typography>
          <Box sx={{ borderTop: 1, borderColor: "divider" }}>
            {history.map((release) => (
              <Box
                key={release.id}
                sx={{ py: 2, borderBottom: 1, borderColor: "divider" }}
              >
                <Typography
                  component={Link}
                  href={href(release.id)}
                  variant="subtitle2"
                  sx={{
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  {release.candidateLabel}
                </Typography>
                <ReleaseOverviewSummary
                  overview={overview(release.id)}
                  compact
                />
              </Box>
            ))}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
