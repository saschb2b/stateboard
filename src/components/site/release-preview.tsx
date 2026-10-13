"use client";

import { useTranslations } from "next-intl";

import { useId, useState } from "react";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CallMadeIcon from "@mui/icons-material/CallMade";
import { ReadinessChip } from "@/components/release/readiness-summary";
import { SiteLink } from "./site-link";

export function ReleasePreview() {
  const t = useTranslations("Visual");
  const views = [
    { label: t("overview"), destination: "release" },
    { label: t("architecture"), destination: "backend" },
    { label: t("checks"), destination: "qa" },
  ] as const;

  const outcomes = [
    {
      name: t("traceReleaseDependency"),
      detail: t("reviewDependencyPath"),
      state: "ready",
    },
    {
      name: t("preserveBaseline"),
      detail: t("scopeEvidenceRationale"),
      state: "ready",
    },
    {
      name: t("restoreData"),
      detail: t("recoveryEvidence"),
      state: "needs_evidence",
    },
  ] as const;

  const checks = [
    {
      name: t("workspaceDependencies"),
      detail: t("boundaryCandidate"),
      state: "ready",
    },
    {
      name: t("preserveReview"),
      detail: t("snapshotCandidate"),
      state: "ready",
    },
    {
      name: t("restoreBackup"),
      detail: t("noOperationsObservation"),
      state: "needs_evidence",
    },
  ] as const;

  const id = useId();
  const [view, setView] = useState(0);
  const selected = views[view] ?? views[0];
  return (
    <Box
      component="section"
      aria-label={t("illustrativeAssessment")}
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
          {t("nextRelease")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("illustrativeNoLiveData")}
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
            {t("releaseAssessment")}
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
              {t("needsEvidence")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("oneOpenCheck")}
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
            <Box component="dt">{t("candidate")}</Box>
            <Box component="dd">{t("exampleCandidate")}</Box>
            <Box component="dt">{t("validation")}</Box>
            <Box component="dd">{t("staging")}</Box>
            <Box component="dt">{t("target")}</Box>
            <Box component="dd">{t("production")}</Box>
          </Box>
        </Stack>
        <Box sx={{ minWidth: 0, px: { xs: 2.5, md: 4 }, pb: 2.5 }}>
          <Tabs
            aria-label={t("previewViews")}
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
                  {t("supportsReview")}
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1.5}
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  {[t("reviewUi"), t("releaseApi"), "PostgreSQL"].map(
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
                            {[t("frontend"), t("backend"), t("data")][index]}
                          </Typography>
                        </Box>
                      </Stack>
                    ),
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t("dependencyExplanation")}
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
            {t(`exploreDemo.${selected.destination}`)}
          </SiteLink>
        </Box>
      </Box>
    </Box>
  );
}
