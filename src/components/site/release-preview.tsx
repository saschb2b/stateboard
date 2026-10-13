"use client";

import { useId, useState } from "react";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CallMadeIcon from "@mui/icons-material/CallMade";
import { ReadinessChip } from "@/components/release/readiness-summary";
import { SiteLink } from "./site-link";

const views = [
  { label: "Overview", destination: "release" },
  { label: "Architecture", destination: "backend" },
  { label: "Checks", destination: "qa" },
] as const;

const outcomes = [
  {
    name: "Trace a release dependency",
    detail: "Review UI → Release API → PostgreSQL",
    state: "ready",
  },
  {
    name: "Preserve the review baseline",
    detail: "Scope, evidence, and rationale saved together",
    state: "ready",
  },
  {
    name: "Restore product data",
    detail: "A recovery drill still needs evidence",
    state: "needs_evidence",
  },
] as const;

const checks = [
  {
    name: "Dependencies stay within the workspace",
    detail: "Boundary tests · matching candidate",
    state: "ready",
  },
  {
    name: "Later edits preserve the saved review",
    detail: "Snapshot checks · matching candidate",
    state: "ready",
  },
  {
    name: "A backup restores without data loss",
    detail: "No observation submitted · Operations",
    state: "needs_evidence",
  },
] as const;

export function ReleasePreview() {
  const id = useId();
  const [view, setView] = useState(0);
  const selected = views[view] ?? views[0];
  return (
    <Box
      component="section"
      aria-label="Illustrative StateBoard assessment"
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={1}
        sx={{
          px: { xs: 2.5, md: 4 },
          py: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          StateBoard{" "}
          <Box component="span" sx={{ mx: 1, color: "text.secondary" }}>
            /
          </Box>{" "}
          Next release
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Illustrative assessment · no live data
        </Typography>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
        }}
      >
        <Stack
          spacing={2}
          sx={{
            p: { xs: 2.5, md: 4 },
            bgcolor: "background.default",
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: { xs: "divider", md: "divider" },
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Release assessment
          </Typography>
          <Box>
            <Typography
              component="h2"
              sx={{
                fontSize: "1.5rem",
                lineHeight: 1.2,
                letterSpacing: "-0.035em",
                fontWeight: 550,
                mb: 1,
              }}
            >
              Needs evidence
            </Typography>
            <Typography variant="body2" color="text.secondary">
              One open check before approval.
            </Typography>
          </Box>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 2,
              rowGap: 1,
              fontSize: "0.8125rem",
              "& dt": { color: "text.secondary" },
              "& dd": { m: 0, textAlign: "right" },
            }}
          >
            <Box component="dt">Candidate</Box>
            <Box component="dd">Example RC 1</Box>
            <Box component="dt">Validation</Box>
            <Box component="dd">Staging</Box>
            <Box component="dt">Target</Box>
            <Box component="dd">Production</Box>
          </Box>
        </Stack>
        <Box sx={{ minWidth: 0, px: { xs: 2.5, md: 4 }, pb: 2.5 }}>
          <Tabs
            aria-label="Assessment preview views"
            value={view}
            onChange={(_, next: number) => setView(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              mb: 1,
              minHeight: 56,
            }}
          >
            {views.map((item, index) => (
              <Tab
                key={item.label}
                id={`${id}-tab-${index}`}
                aria-controls={`${id}-panel`}
                label={item.label}
                sx={{ minHeight: 56, minWidth: 0, px: { xs: 1.5, sm: 2 } }}
              />
            ))}
          </Tabs>
          <Box
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${view}`}
            tabIndex={0}
            sx={{ minHeight: { md: 228 }, outlineOffset: 4 }}
          >
            {view === 1 ? (
              <Stack spacing={2.5} sx={{ py: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  What supports the release review?
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1.5}
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  {["Review UI", "Release API", "PostgreSQL"].map(
                    (name, index) => (
                      <Stack
                        key={name}
                        direction="row"
                        alignItems="center"
                        gap={1.5}
                        sx={{ flex: 1 }}
                      >
                        {index > 0 && (
                          <ArrowForwardIcon
                            fontSize="small"
                            sx={{
                              color: "text.secondary",
                              display: { xs: "none", sm: "block" },
                            }}
                          />
                        )}
                        <Box
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            p: 1.5,
                            flex: 1,
                          }}
                        >
                          <Typography variant="body2" fontWeight={550}>
                            {name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {["Frontend", "Backend", "Data"][index]}
                          </Typography>
                        </Box>
                      </Stack>
                    ),
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Declared dependencies explain the path. Matching checks
                  establish whether it works.
                </Typography>
              </Stack>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                {(view === 2 ? checks : outcomes).map((item) => (
                  <Box
                    component="li"
                    key={item.name}
                    sx={{
                      py: 2,
                      borderBottom: 1,
                      borderColor: "divider",
                      "&:last-child": { border: 0 },
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      gap={0.5}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={550}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.detail}
                        </Typography>
                      </Box>
                      <ReadinessChip state={item.state} verification />
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <SiteLink
            href={`/share/demo/releases?view=${selected.destination}`}
            size="small"
            color="inherit"
            endIcon={<CallMadeIcon fontSize="small" />}
            sx={{ px: 0 }}
          >
            Explore {selected.label.toLowerCase()} in the demo
          </SiteLink>
        </Box>
      </Box>
    </Box>
  );
}
