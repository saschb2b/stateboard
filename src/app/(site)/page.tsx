"use client";
import { useTranslations } from "next-intl";
import { Box, Container, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import GitHubIcon from "@mui/icons-material/GitHub";
import { AppHeader } from "@/components/app/app-header";
import { ReleasePreview } from "@/components/site/release-preview";
import { SiteLink } from "@/components/site/site-link";
import { designTokens } from "@/lib/design-tokens";
import { version } from "../../../package.json";

const landingType = designTokens.typography.landing;

export default function LandingPage() {
  const t = useTranslations("Common");
  const perspectives = [
    {
      role: t("perspectiveProduct"),
      question: t("questionProduct"),
      view: "release",
    },
    {
      role: t("perspectiveBackend"),
      question: t("questionBackend"),
      view: "backend",
    },
    {
      role: t("perspectiveQa"),
      question: t("questionQa"),
      view: "qa",
    },
    {
      role: t("perspectiveFrontend"),
      question: t("questionFrontend"),
      view: "visual",
    },
    {
      role: t("perspectiveOperations"),
      question: t("questionOperations"),
      view: "operations",
    },
    {
      role: t("perspectiveDecision"),
      question: t("questionDecision"),
      view: "decision",
    },
  ];
  return (
    <>
      <AppHeader
        actions={
          <>
            <SiteLink
              href="#agents"
              color="inherit"
              size="small"
              sx={{ display: { xs: "none", md: "inline-flex" } }}
            >
              {t("forAgents")}
            </SiteLink>
            <SiteLink
              href="/docs"
              color="inherit"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              {t("docs")}
            </SiteLink>
            <SiteLink
              href="/boards"
              variant="outlined"
              color="inherit"
              size="small"
            >
              {t("openWorkspace")}
            </SiteLink>
          </>
        }
      />
      <Box component="main">
        <Container
          maxWidth="lg"
          sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 8 } }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr" },
              gap: { xs: 3, md: 8 },
              alignItems: "end",
              mb: { xs: 5, md: 7 },
            }}
          >
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "primary.main", fontWeight: 500, mb: 2.5 }}
              >
                {t("landingKicker")}
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  fontSize: {
                    xs: landingType.displayCompact,
                    sm: landingType.displayMedium,
                    md: landingType.display,
                  },
                  fontWeight: landingType.weight,
                  letterSpacing: landingType.displayTracking,
                  lineHeight: landingType.displayLeading,
                  maxWidth: 680,
                }}
              >
                {t("landingTitle")}
              </Typography>
            </Box>
            <Stack spacing={3} sx={{ pb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: landingType.lead,
                  lineHeight: 1.65,
                  color: "text.secondary",
                  maxWidth: 410,
                }}
              >
                {t("landingLead")}
              </Typography>
              <Stack
                direction="row"
                gap={1.5}
                flexWrap="wrap"
                alignItems="center"
              >
                <SiteLink
                  href="/share/demo/releases"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                >
                  {t("exploreDemo")}
                </SiteLink>
                <SiteLink href="/docs/getting-started" color="inherit">
                  {t("getStarted")}
                </SiteLink>
              </Stack>
            </Stack>
          </Box>
          <ReleasePreview />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            gap={1}
            sx={{ mt: 2 }}
          >
            <Typography variant="caption" color="text.secondary">
              {t("screenPart")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("openSource")}
            </Typography>
          </Stack>
        </Container>
        <Container
          component="section"
          maxWidth="lg"
          aria-labelledby="perspectives-heading"
          sx={{ py: { xs: 5, md: 8 }, borderTop: 1, borderColor: "divider" }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1.5fr" },
              gap: { xs: 4, md: 10 },
            }}
          >
            <Box>
              <Typography
                id="perspectives-heading"
                component="h2"
                sx={{
                  fontSize: {
                    xs: landingType.headingCompact,
                    md: landingType.heading,
                  },
                  lineHeight: landingType.headingLeading,
                  fontWeight: landingType.weight,
                  letterSpacing: landingType.headingTracking,
                  mb: 2,
                }}
              >
                {t("usefulView")}
                <br />
                {t("everyRole")}
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 340 }}>
                {t("reviewPerspective")}
              </Typography>
            </Box>
            <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
              {perspectives.map((item) => (
                <Box
                  component="li"
                  key={item.view}
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    "&:first-child": { borderTop: 1 },
                  }}
                >
                  <SiteLink
                    href={`/share/demo/releases?view=${item.view}`}
                    color="inherit"
                    fullWidth
                    endIcon={
                      <ArrowOutwardIcon sx={{ color: "text.secondary" }} />
                    }
                    sx={{
                      py: 2,
                      px: 0,
                      justifyContent: "space-between",
                      textAlign: "left",
                      "& .MuiButton-endIcon": { mr: 0.5 },
                    }}
                  >
                    <Box>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 0.5 }}
                      >
                        {item.role}
                      </Typography>
                      <Typography component="span" variant="body1">
                        {item.question}
                      </Typography>
                    </Box>
                  </SiteLink>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
        <Box
          component="section"
          id="agents"
          aria-labelledby="agents-heading"
          sx={{
            bgcolor: "background.paper",
            borderBlock: 1,
            borderColor: "divider",
            scrollMarginTop: 80,
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: { xs: 4, md: 10 },
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="body2" color="primary.main" sx={{ mb: 2 }}>
                  {t("agentUpkeep")}
                </Typography>
                <Typography
                  id="agents-heading"
                  component="h2"
                  sx={{
                    fontSize: {
                      xs: landingType.headingCompact,
                      md: landingType.heading,
                    },
                    lineHeight: landingType.headingLeading,
                    fontWeight: landingType.weight,
                    letterSpacing: landingType.headingTracking,
                    mb: 2,
                  }}
                >
                  {t("letAgents")}
                  <br />
                  {t("recordCurrent")}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mb: 2, maxWidth: 420 }}
                >
                  {t("agentLead")}
                </Typography>
                <SiteLink
                  href="/docs/agents"
                  color="inherit"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ px: 0 }}
                >
                  {t("connectAgent")}
                </SiteLink>
              </Box>
              <Box
                sx={{
                  borderLeft: 1,
                  borderColor: "divider",
                  pl: { xs: 3, md: 4 },
                }}
              >
                <Stack
                  component="ol"
                  spacing={3}
                  sx={{ listStyle: "none", p: 0, m: 0 }}
                >
                  {[
                    ["01", t("readProduct"), t("reuseProduct")],
                    ["02", t("recordObserved"), t("keepResults")],
                    ["03", t("bringReview"), t("humanDecision")],
                  ].map(([number, title, body]) => (
                    <Stack
                      component="li"
                      key={number}
                      direction="row"
                      spacing={2}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ pt: 0.4 }}
                      >
                        {number}
                      </Typography>
                      <Box>
                        <Typography fontWeight={550} sx={{ mb: 0.5 }}>
                          {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {body}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 3 }}
                >
                  {t("noBackground")}
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>
        <Container
          component="section"
          maxWidth="lg"
          sx={{ py: { xs: 5, md: 7 } }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={3}
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography
                component="h2"
                variant="h5"
                sx={{ fontWeight: landingType.weight, mb: 1 }}
              >
                {t("keepAssessment")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("selfHostLead")}
              </Typography>
            </Box>
            <SiteLink
              href="/docs/self-hosting"
              variant="outlined"
              color="inherit"
              endIcon={<ArrowForwardIcon />}
            >
              {t("selfHostGuide")}
            </SiteLink>
          </Stack>
        </Container>
      </Box>
      <Container
        component="footer"
        maxWidth="lg"
        sx={{ py: 3, borderTop: 1, borderColor: "divider" }}
      >
        <Stack
          direction="row"
          gap={2}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Typography variant="caption" color="text.secondary">
            {t("developmentVersion", { version })}
          </Typography>
          <Stack direction="row" gap={1}>
            <SiteLink
              href="https://github.com/saschb2b/stateboard"
              color="inherit"
              size="small"
              startIcon={<GitHubIcon />}
            >
              GitHub
            </SiteLink>
            <SiteLink href="/docs/changelog" color="inherit" size="small">
              {t("changelog")}
            </SiteLink>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
