"use client";

import { Box, Stack, Typography } from "@mui/material";
import { MONO_FONT } from "@/lib/theme";
import type { ReleaseAssessment } from "@/lib/release-types";

export function ReleaseContext({
  assessment,
  collapsible = false,
}: {
  assessment: ReleaseAssessment;
  collapsible?: boolean;
}) {
  return (
    <Box component={collapsible ? "details" : "div"} sx={{ minWidth: 0 }}>
      {collapsible && (
        <Typography
          component="summary"
          variant="body2"
          color="text.secondary"
          sx={{
            cursor: "pointer",
            width: "fit-content",
            "&:hover": { color: "text.primary" },
          }}
        >
          Candidate details
        </Typography>
      )}
      <Stack component="dl" spacing={1} sx={{ m: 0, mt: collapsible ? 2 : 0 }}>
        {[
          ["Candidate", assessment.candidateRef],
          ["Validation", assessment.validationEnvironment],
          ["Target", assessment.targetEnvironment],
          ["Audience", assessment.audience],
          ["Configuration", assessment.configurationRef],
          ["Owner", assessment.ownerLabel],
        ].map(([label, value]) => (
          <Box
            key={label}
            sx={{
              display: "grid",
              gridTemplateColumns: "100px minmax(0, 1fr)",
              gap: 1,
            }}
          >
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant="caption"
              sx={{
                m: 0,
                overflowWrap: "anywhere",
                ...(label === "Candidate" ? { fontFamily: MONO_FONT } : {}),
              }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
