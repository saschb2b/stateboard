import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GitHubIcon from "@mui/icons-material/GitHub";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { AppHeader } from "@/components/app-header";
import { LandingMockup } from "@/components/landing-mockup";
import { StateChip } from "@/components/state-chip";

const PROBLEMS = [
  {
    title: "The prose problem",
    body: '"As a returning user, I want to filter my dashboard by region" tells leadership nothing about whether the filter works, whether the data is real, or whether the chart next to it is even hooked up.',
  },
  {
    title: "The granularity problem",
    body: "Jira shows 200 tickets across 14 epics. The exec wants to see 8 screens with 3 colors. Roll-ups hide failure; ticket lists overwhelm. Neither answers the question.",
  },
  {
    title: "The medium mismatch",
    body: "A visual product deserves visual reporting. Leadership will see screens in the demo — they should see the same screens in the status update, with state painted directly onto them.",
  },
  {
    title: "The maintenance tax",
    body: "Teams that try to solve this by hand end up with a parallel tracking system in Confluence, Miro, or a custom tool. It works for 3 weeks, then drifts. Then nobody trusts it.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Capture",
    body: "Upload a screenshot of your app — staging, prod, or a styled mock. v0 is manual; the headless capture pipeline lands in v1.",
  },
  {
    n: "02",
    title: "Annotate",
    body: "Drag rectangles over the parts that matter. Tag each one as shipped, mock, or missing. Add a label and notes if you want.",
  },
  {
    n: "03",
    title: "Share",
    body: "Send one read-only link. Stakeholders see the same screens you demo, painted with state. No login, no Jira tour required.",
  },
];

export default function LandingPage() {
  return (
    <>
      <AppHeader
        actions={
          <>
            <Link
              href="/docs"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Button
                size="small"
                color="inherit"
                startIcon={<MenuBookIcon />}
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                Docs
              </Button>
            </Link>
            <Link
              href="https://github.com/saschb2b/stateboard"
              target="_blank"
              rel="noopener"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Button
                size="small"
                color="inherit"
                startIcon={<GitHubIcon />}
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                GitHub
              </Button>
            </Link>
            <Link href="/boards" style={{ textDecoration: "none" }}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
              >
                Open boards
              </Button>
            </Link>
          </>
        }
      />

      {/* Hero */}
      <Container
        maxWidth="lg"
        sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 10 } }}
      >
        <Stack
          spacing={3}
          alignItems="center"
          sx={{ textAlign: "center", mb: { xs: 6, md: 9 } }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <StateChip state="shipped" size="sm" />
            <StateChip state="mock" size="sm" />
            <StateChip state="missing" size="sm" />
          </Stack>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem" },
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            Show, don&apos;t tell
            <Box
              component="span"
              aria-hidden
              sx={{
                display: "inline-block",
                width: { xs: 14, md: 22 },
                height: { xs: 14, md: 22 },
                bgcolor: "primary.main",
                ml: 0.75,
                mb: { xs: 0.5, md: 1 },
                verticalAlign: "baseline",
                borderRadius: 0.5,
              }}
            />
          </Typography>
          <Typography
            variant="h6"
            sx={{
              maxWidth: 760,
              color: "text.secondary",
              fontWeight: 400,
              fontSize: { xs: "1.05rem", md: "1.25rem" },
              lineHeight: 1.55,
            }}
          >
            Status reporting for visual products — built around the screens
            stakeholders actually see, not the tickets engineers actually file.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ pt: 2 }}
          >
            <Link href="/boards" style={{ textDecoration: "none" }}>
              <Button
                size="large"
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                sx={{ px: 3.5, py: 1.25 }}
              >
                Open your boards
              </Button>
            </Link>
            <Link
              href="https://github.com/saschb2b/stateboard"
              target="_blank"
              rel="noopener"
              style={{ textDecoration: "none" }}
            >
              <Button
                size="large"
                variant="outlined"
                startIcon={<GitHubIcon />}
                sx={{ px: 3.5, py: 1.25 }}
              >
                Read the source
              </Button>
            </Link>
          </Stack>
        </Stack>

        <LandingMockup />
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 2,
            color: "text.secondary",
            fontStyle: "italic",
          }}
        >
          A real screen, painted with state. One link. Updated by the team that
          owns it.
        </Typography>
      </Container>

      {/* The problem */}
      <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Stack spacing={1.5} sx={{ mb: 6, maxWidth: 760 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              01 — The problem
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}
            >
              Jira is for engineers. Execs need a different artifact.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ pt: 1 }}>
              Every product team building a visual webapp eventually hits the
              same wall: the more carefully you write user-value-focused
              stories, the worse they perform as status updates for
              non-technical leadership.
            </Typography>
            <Box
              sx={{
                mt: 3,
                p: 3,
                borderLeft: 4,
                borderColor: "primary.main",
                bgcolor: "background.paper",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontStyle: "italic",
                  color: "text.primary",
                  fontWeight: 500,
                }}
              >
                &quot;What&apos;s actually working right now? What&apos;s still
                mock data? What hasn&apos;t been built yet?&quot;
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", mt: 1, display: "block" }}
              >
                — Every executive, in every quarterly review, ever
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            }}
          >
            {PROBLEMS.map((p) => (
              <Paper key={p.title} sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {p.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {p.body}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Container>
      </Box>

      {/* The thesis + how it works */}
      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Stack spacing={1.5} sx={{ mb: 6, maxWidth: 760 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              02 — The thesis
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}
            >
              The unit of truth is the{" "}
              <Box component="span" sx={{ color: "primary.main" }}>
                screen region
              </Box>
              , not the ticket.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ pt: 1 }}>
              Leadership doesn&apos;t think in epics. They think in journeys and
              screens. The right primitive is &quot;this rectangle on this
              screen, in this state.&quot;
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            }}
          >
            {STEPS.map((s) => (
              <Box
                key={s.n}
                sx={{
                  position: "relative",
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.default",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                  }}
                >
                  {s.n}
                </Typography>
                <Typography variant="h5" sx={{ mb: 1, mt: 0.5 }}>
                  {s.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {s.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Distribution / airgap */}
      <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 4, md: 8 }}
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Stack spacing={2} sx={{ flex: 1, maxWidth: 560 }}>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                Distribution
              </Typography>
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" } }}
              >
                Open source. Self-hosted. Airgap-ready.
              </Typography>
              <Typography variant="body1" color="text.secondary">
                One Docker image. MIT license. Designed from day one for the
                teams that aren&apos;t allowed to send screenshots of their
                product to a third-party server in the first place.
              </Typography>
            </Stack>

            <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
              <Highlight
                icon={<CloudOffOutlinedIcon />}
                title="Airgap by default"
                body="Zero outbound calls. No license server, no phone-home, no analytics."
              />
              <Highlight
                icon={<LockOutlinedIcon />}
                title="One container"
                body="docker run stateboard — under 60 seconds. SQLite by default, Postgres optional in v1."
              />
              <Highlight
                icon={<ArticleOutlinedIcon />}
                title="MIT license"
                body="Use it, fork it, ship it inside your product. The license means what it says."
              />
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container
          maxWidth="md"
          sx={{ py: { xs: 8, md: 12 }, textAlign: "center" }}
        >
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, mb: 2 }}
          >
            Stop telling them. Start showing them.
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: "auto" }}
          >
            Create your first board, drop in a screenshot, mark a region. The
            link you get back is the deck you don&apos;t have to build.
          </Typography>
          <Link href="/boards" style={{ textDecoration: "none" }}>
            <Button
              size="large"
              variant="contained"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              Open your boards
            </Button>
          </Link>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          py: 3,
          px: 3,
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ color: "text.secondary" }}
          >
            <Typography variant="caption">
              StateBoard v0.1 · MIT · Show, don&apos;t tell.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Link
                href="/docs"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="caption"
                  sx={{ "&:hover": { color: "primary.main" } }}
                >
                  Docs
                </Typography>
              </Link>
              <Link
                href="https://github.com/saschb2b/stateboard"
                target="_blank"
                rel="noopener"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="caption"
                  sx={{ "&:hover": { color: "primary.main" } }}
                >
                  GitHub
                </Typography>
              </Link>
              <Link
                href="/boards"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="caption"
                  sx={{ "&:hover": { color: "primary.main" } }}
                >
                  Boards
                </Typography>
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

function Highlight({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        p: 2.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </Box>
    </Stack>
  );
}
