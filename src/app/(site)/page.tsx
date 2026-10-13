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

const perspectives = [
  {
    role: "Product & delivery",
    question: "Which outcomes can we release?",
    view: "release",
  },
  {
    role: "Backend & architecture",
    question: "What does this capability depend on?",
    view: "backend",
  },
  {
    role: "QA & testing",
    question: "What passed for this exact candidate?",
    view: "qa",
  },
  {
    role: "Frontend & design",
    question: "What works behind this screen?",
    view: "visual",
  },
  {
    role: "Operations",
    question: "Can we deploy and recover it?",
    view: "operations",
  },
  {
    role: "Release owners",
    question: "What supports the decision?",
    view: "decision",
  },
];

export default function LandingPage() {
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
              For agents
            </SiteLink>
            <SiteLink href="/docs" color="inherit" size="small">
              Docs
            </SiteLink>
            <SiteLink
              href="/boards"
              variant="outlined"
              color="inherit"
              size="small"
            >
              Open workspace
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
                Release readiness for the whole team
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
                Know what’s ready to release.
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
                Connect product capabilities to their dependencies and evidence.
                Give every role a clear view of what works, what’s missing, and
                what needs a decision.
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
                  Explore the demo
                </SiteLink>
                <SiteLink href="/docs/getting-started" color="inherit">
                  Get started
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
              A screen is one part of the product. See the work behind it.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Open source · Self-hosted · API + MCP
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
                A useful view
                <br />
                for every role.
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 340 }}>
                Review the same candidate from the perspective that matters to
                your work.
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
                  Built for agent upkeep
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
                  Let agents keep
                  <br />
                  the record current.
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mb: 2, maxWidth: 420 }}
                >
                  Your coding agent can map capabilities, update dependencies,
                  and submit observed results through MCP or REST. CI can append
                  evidence from the checks it runs.
                </Typography>
                <SiteLink
                  href="/docs/agents"
                  color="inherit"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ px: 0 }}
                >
                  Connect your agent
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
                    [
                      "01",
                      "Read the product",
                      "Reuse its capabilities, owners, and dependencies.",
                    ],
                    [
                      "02",
                      "Record what was observed",
                      "Keep passing, failing, and inconclusive results tied to the candidate.",
                    ],
                    [
                      "03",
                      "Bring it back for review",
                      "A human owner records the release decision and its rationale.",
                    ],
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
                  Runs in your agent or CI workflow. Connecting MCP does not
                  start background maintenance.
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
                Keep the assessment with your team.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Self-host StateBoard with PostgreSQL and your company’s identity
                provider.
              </Typography>
            </Box>
            <SiteLink
              href="/docs/self-hosting"
              variant="outlined"
              color="inherit"
              endIcon={<ArrowForwardIcon />}
            >
              Self-hosting guide
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
            Development preview · baseline v{version} · MIT
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
              Changelog
            </SiteLink>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
