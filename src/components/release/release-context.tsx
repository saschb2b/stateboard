"use client";

import { Chip, Paper, Stack, Typography } from "@mui/material";
import type { ReleaseAssessment } from "@/lib/release-types";

export function ReleaseContext({
  assessment,
}: {
  assessment: ReleaseAssessment;
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
          Candidate: {assessment.candidateRef}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip
            size="small"
            label={`Validation: ${assessment.validationEnvironment}`}
          />
          <Chip
            size="small"
            label={`Target: ${assessment.targetEnvironment}`}
          />
          <Chip size="small" label={`Audience: ${assessment.audience}`} />
          <Chip
            size="small"
            label={`Configuration: ${assessment.configurationRef}`}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
