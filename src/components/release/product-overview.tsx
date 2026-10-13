"use client";

import { useTranslations } from "next-intl";

import { useEffect } from "react";
import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { buildProductOverview } from "@/lib/product-overview";
import type { ProductContext } from "@/lib/release-types";
import { ReadinessChip } from "./readiness-summary";
import { ProductOverviewCapabilities } from "./product-overview-capabilities";
import { ProductOverviewCoverage } from "./product-overview-coverage";
import { useServerClock } from "./use-server-clock";
import type { ProductSection } from "./use-product-section";

export function ProductOverview({
  product,
  editable,
  onCreate,
  onNavigate,
}: {
  product: ProductContext;
  editable: boolean;
  onCreate: () => void;
  onNavigate: (section: ProductSection) => void;
}) {
  const t = useTranslations("Product");
  const releaseT = useTranslations("Release");
  const latest = product.releases[0];
  const overview = product.releaseOverviews?.find(
    (item) => item.assessment.id === latest?.id,
  );
  const { now, advance } = useServerClock(
    overview?.evaluatedAt ?? 0,
    !overview,
  );
  const checkedNow = Math.max(now, overview?.evaluatedAt ?? 0);
  const model = buildProductOverview(product, overview, checkedNow);
  const expiries = [
    overview?.validUntil,
    ...model.checks
      .filter((check) => check.state === "pass")
      .map((check) => check.expiresAt),
  ].filter(
    (time): time is number => typeof time === "number" && time > checkedNow,
  );
  const nextExpiry = expiries.length ? Math.min(...expiries) : null;
  useEffect(() => {
    if (nextExpiry === null) return;
    const timer = setTimeout(
      advance,
      Math.max(1, Math.min(30_000, nextExpiry - checkedNow + 1)),
    );
    return () => clearTimeout(timer);
  }, [nextExpiry, checkedNow, advance]);
  const assessmentHref = latest
    ? `/boards/${product.board.id}/releases/${latest.id}`
    : undefined;
  const currentDecision =
    overview?.decisionRevision === latest?.revision && !model.evidenceExpired;
  const emptyScope = model.coverageKnown && model.counts.included === 0;
  const findingCount =
    model.findings.length + model.missingAcceptance.length + Number(emptyScope);
  return (
    <Stack spacing={3}>
      <Box
        component="section"
        aria-label={t("latestAssessment")}
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          bgcolor: "background.paper",
          p: { xs: 2, sm: 2.5 },
        }}
      >
        {latest && assessmentHref ? (
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              gap={2}
            >
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("latestAssessment")}
                </Typography>
                <Typography
                  component="h2"
                  variant="subtitle1"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {latest.candidateLabel}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {t("environments", {
                    validation: latest.validationEnvironment,
                    target: latest.targetEnvironment,
                  })}
                </Typography>
              </Stack>
              <Button
                component={Link}
                href={assessmentHref}
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{ flexShrink: 0 }}
              >
                {t("reviewAssessment")}
              </Button>
            </Stack>
            <Stack
              direction="row"
              flexWrap="wrap"
              alignItems="center"
              gap={1.5}
            >
              {model.state ? (
                <Box
                  sx={{
                    "& .MuiChip-root": { fontSize: "1.05rem", height: 28 },
                  }}
                >
                  <ReadinessChip state={model.state} />
                </Box>
              ) : (
                <Typography variant="body2">
                  {t("readinessUnavailable")}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {!overview
                  ? t("refreshEvaluation")
                  : model.evidenceExpired
                    ? t("evidenceExpired")
                    : t("findingCounts", {
                        blockers: overview.blockerCount,
                        gaps: overview.gapCount,
                      })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overview?.decision
                  ? t(currentDecision ? "decision" : "earlierDecision", {
                      decision: t(`decisions.${overview.decision}`),
                    })
                  : overview
                    ? t("noDecision")
                    : t("decisionUnavailable")}
              </Typography>
            </Stack>
            {findingCount > 0 && (
              <Box
                component="details"
                sx={{ pt: 1.5, borderTop: 1, borderColor: "divider" }}
              >
                <Typography
                  component="summary"
                  variant="body2"
                  sx={{ cursor: "pointer", width: "fit-content" }}
                >
                  {t("unresolvedCount", { count: findingCount })}
                </Typography>
                <Stack
                  component="ul"
                  spacing={1.5}
                  sx={{ pl: 2.5, mb: 0, mt: 1.5 }}
                >
                  {emptyScope && (
                    <Typography component="li" variant="body2">
                      {t("noIncludedCapabilities")}
                    </Typography>
                  )}
                  {model.findings.map((check) => (
                    <Box component="li" key={check.id}>
                      <Typography
                        component={Link}
                        href={`${assessmentHref}?view=qa&check=${check.id}`}
                        variant="body2"
                        sx={{
                          color: "text.primary",
                          textUnderlineOffset: 3,
                          "&:hover": { color: "primary.main" },
                        }}
                      >
                        {check.claim}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {releaseT(`results.${check.state}`)} ·{" "}
                        {check.ownerLabel || t("noOwner")}
                      </Typography>
                    </Box>
                  ))}
                  {model.missingAcceptance.map((capability) => (
                    <Typography
                      component="li"
                      variant="body2"
                      key={capability.capabilityId}
                    >
                      {t("missingAcceptanceNamed", { name: capability.name })}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack alignItems="flex-start" spacing={1.5}>
            <Typography component="h2" variant="subtitle1">
              {t("noAssessment")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {model.counts.activeCapabilities
                ? t("catalogAssessmentHelp")
                : t("startOutcomes")}
            </Typography>
            {editable && (
              <Button
                variant="contained"
                onClick={
                  model.counts.activeCapabilities
                    ? onCreate
                    : () => onNavigate("capabilities")
                }
              >
                {model.counts.activeCapabilities
                  ? t("newAssessment")
                  : t("addCapabilities")}
              </Button>
            )}
          </Stack>
        )}
      </Box>
      <ProductOverviewCapabilities
        capabilities={model.capabilities}
        hasAssessment={!!latest}
        onManage={() => onNavigate("capabilities")}
      />
      <ProductOverviewCoverage
        categories={model.categories}
        assessmentHref={assessmentHref}
      />
      <Box
        component="section"
        aria-label={t("productConnections")}
        sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}
      >
        <Typography variant="caption" color="text.secondary">
          {t("declaredConnections")}
          {model.architectureTruncated ? t("partialGraph") : ""}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mt={0.5}>
          <Button
            color="inherit"
            size="small"
            onClick={() => onNavigate("dependencies")}
          >
            {t("componentCount", { count: model.counts.components })}
          </Button>
          <Button
            color="inherit"
            size="small"
            onClick={() => onNavigate("connections")}
          >
            {t("dependencyCount", { count: model.counts.dependencies })}
          </Button>
          <Button
            color="inherit"
            size="small"
            component={Link}
            href={`/boards/${product.board.id}`}
          >
            {model.counts.screens === 0
              ? t("noScreensAdded")
              : t("mappedScreens", {
                  mapped: model.counts.mappedScreens,
                  count: model.counts.screens,
                })}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
