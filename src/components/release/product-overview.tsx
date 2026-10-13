"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { buildProductOverview } from "@/lib/product-overview";
import type { ProductContext } from "@/lib/release-types";
import { CHECK_RESULT_LABELS } from "@/components/evidence/check-result-labels";
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
        aria-label="Latest assessment"
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
                  Latest assessment
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
                  Validation: {latest.validationEnvironment} → Target:{" "}
                  {latest.targetEnvironment}
                </Typography>
              </Stack>
              <Button
                component={Link}
                href={assessmentHref}
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{ flexShrink: 0 }}
              >
                Review assessment
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
                <Typography variant="body2">Readiness unavailable</Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {!overview
                  ? "Refresh to load the evaluation"
                  : model.evidenceExpired
                    ? "Evidence has expired"
                    : `${overview.blockerCount} blocker${overview.blockerCount === 1 ? "" : "s"} · ${overview.gapCount} evidence gap${overview.gapCount === 1 ? "" : "s"}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overview?.decision
                  ? `${currentDecision ? "Decision" : "Earlier decision"}: ${overview.decision}`
                  : overview
                    ? "No recorded decision"
                    : "Decision unavailable"}
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
                  {findingCount} unresolved item{findingCount === 1 ? "" : "s"}
                </Typography>
                <Stack
                  component="ul"
                  spacing={1.5}
                  sx={{ pl: 2.5, mb: 0, mt: 1.5 }}
                >
                  {emptyScope && (
                    <Typography component="li" variant="body2">
                      No capabilities included in this assessment.
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
                        {CHECK_RESULT_LABELS[check.state]} ·{" "}
                        {check.ownerLabel || "No owner assigned"}
                      </Typography>
                    </Box>
                  ))}
                  {model.missingAcceptance.map((capability) => (
                    <Typography
                      component="li"
                      variant="body2"
                      key={capability.capabilityId}
                    >
                      {capability.name}: no required functional acceptance
                      check.
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack alignItems="flex-start" spacing={1.5}>
            <Typography component="h2" variant="subtitle1">
              No release assessment yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {model.counts.activeCapabilities
                ? "The catalog describes this product. Assess a candidate to see what is verified and what still needs evidence."
                : "Start with the outcomes this product should support, then assess a release candidate."}
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
                  ? "New assessment"
                  : "Add capabilities"}
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
        aria-label="Product connections"
        sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}
      >
        <Typography variant="caption" color="text.secondary">
          Declared product connections
          {model.architectureTruncated
            ? " · Partial graph; open connections to inspect"
            : ""}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mt={0.5}>
          <Button
            color="inherit"
            size="small"
            onClick={() => onNavigate("dependencies")}
          >
            {model.counts.components} components
          </Button>
          <Button
            color="inherit"
            size="small"
            onClick={() => onNavigate("connections")}
          >
            {model.counts.dependencies} dependencies
          </Button>
          <Button
            color="inherit"
            size="small"
            component={Link}
            href={`/boards/${product.board.id}`}
          >
            {model.counts.screens === 0
              ? "No screens added"
              : `${model.counts.mappedScreens}/${model.counts.screens} screens mapped`}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
