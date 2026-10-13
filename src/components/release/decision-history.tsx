"use client";

import { useId } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DecisionSnapshotDetails } from "./decision-snapshot-details";
import type { ReleaseDecision, ReleaseDetail } from "@/lib/release-types";

export function DecisionHistory({
  detail,
  now,
  canPublish,
  onPublish,
}: {
  detail: ReleaseDetail;
  now: number;
  canPublish: boolean;
  onPublish: (decision: ReleaseDecision) => void;
}) {
  const descriptionPrefix = useId();
  const decisions = [...detail.decisions].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  return (
    <Box sx={{ borderTop: decisions.length ? 1 : 0, borderColor: "divider" }}>
      {decisions.map((decision, index) => {
        const historical = decision.revision !== detail.assessment.revision;
        const expired =
          decision.expiresAt !== null && decision.expiresAt <= now;
        return (
          <Accordion
            key={decision.id}
            disableGutters
            square
            slotProps={{ transition: { unmountOnExit: true } }}
            sx={{
              bgcolor: "background.default",
              border: 0,
              borderBottom: 1,
              borderColor: "divider",
              "&::before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon fontSize="small" />}
              aria-label={`Decision by ${decision.actorName} at revision ${decision.revision}`}
              aria-describedby={`${descriptionPrefix}-${decision.id}-state`}
              sx={{
                px: 0,
                py: 0.5,
                gap: 2,
                "& .MuiAccordionSummary-content": { minWidth: 0 },
              }}
            >
              <Stack spacing={0.5} sx={{ minWidth: 0, width: "100%" }}>
                <Stack
                  id={`${descriptionPrefix}-${decision.id}-state`}
                  direction="row"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color:
                        decision.decision === "approved"
                          ? "success.main"
                          : "warning.main",
                    }}
                  >
                    {decision.decision === "approved" ? "Approved" : "Held"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {index === 0 ? "Latest · " : ""}
                    {historical ? "Historical revision" : "Current revision"}
                  </Typography>
                  {expired && (
                    <Typography variant="caption" color="warning.main">
                      Evidence expired
                    </Typography>
                  )}
                </Stack>
                <Typography variant="body2" noWrap>
                  {decision.rationale}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {decision.actorName} ·{" "}
                  <Box
                    component="time"
                    dateTime={new Date(decision.createdAt).toISOString()}
                    title={new Date(decision.createdAt).toISOString()}
                  >
                    {new Date(decision.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </Box>{" "}
                  · Revision {decision.revision}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0.5, pb: 2.5 }}>
              <Stack spacing={2}>
                <Typography variant="body2">{decision.rationale}</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Recorded {new Date(decision.createdAt).toISOString()}
                  </Typography>
                  {decision.expiresAt !== null && (
                    <Typography
                      variant="caption"
                      color={expired ? "warning.main" : "text.secondary"}
                    >
                      Evidence valid until{" "}
                      {new Date(decision.expiresAt).toISOString()}
                    </Typography>
                  )}
                  {historical && (
                    <Typography variant="body2" color="text.secondary">
                      The live assessment has changed since this review. This
                      decision is a historical record.
                    </Typography>
                  )}
                  {expired && (
                    <Typography variant="body2" color="warning.main">
                      Recorded evidence has expired. Review the current
                      assessment before a new decision.
                    </Typography>
                  )}
                </Stack>
                {canPublish && (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                    onClick={() => onPublish(decision)}
                  >
                    Prepare public review link
                  </Button>
                )}
                <DecisionSnapshotDetails decision={decision} />
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
      {decisions.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No decision recorded.
        </Typography>
      )}
    </Box>
  );
}
