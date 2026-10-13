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
import { AppHeader } from "@/components/app/app-header";
import { LandingMockup } from "@/components/site/landing-mockup";
import { ReadinessChip } from "@/components/release/readiness-summary";
import { version } from "../../../package.json";

const PROBLEMS = [
  {
    title: "A screen shows only part of the product",
    body: "A visible button cannot explain the API, worker, event, or data it depends on. Some critical capabilities have no screen at all.",
  },
  {
    title: "Different roles need different views",
    body: "Product teams follow outcomes. Backend developers follow dependencies. QA follows acceptance checks. They need a shared assessment they can each inspect.",
  },
  {
    title: "A passing result needs context",
    body: "Evidence belongs to a candidate, environment, audience, and check definition. A result from last week or another build cannot quietly make this release ready.",
  },
  {
    title: "A decision needs a baseline",
    body: "Keep the scope, evidence, rationale, and selected images that informed a review, so later edits cannot change what a release owner approved.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Define the release",
    body: "Choose a candidate and its intended users. Describe the capabilities, owners, and dependencies that matter. Link screenshots where they help.",
  },
  {
    n: "02",
    title: "Verify the claims",
    body: "Set acceptance checks and attach matching manual or API-submitted evidence. See failures and evidence gaps through the view relevant to your work.",
  },
  {
    n: "03",
    title: "Review and share",
    body: "A release owner records an approval or hold with a preserved baseline. Publish a curated summary and explicitly selected safe images through a revocable link.",
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
            <ReadinessChip state="ready" />
            <ReadinessChip state="blocked" />
            <ReadinessChip state="needs_evidence" />
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
            See what works, what it depends on, and why it is ready to release.
            One shared assessment, with a view for everyone involved.
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
              href="/share/demo/releases"
              style={{ textDecoration: "none" }}
            >
              <Button
                size="large"
                variant="outlined"
                startIcon={<ArticleOutlinedIcon />}
                sx={{ px: 3.5, py: 1.25 }}
              >
                Explore a release assessment
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
          Screenshots remain the visual view. Capabilities and evidence connect
          them to the rest of the product.
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
              01 · The problem
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}
            >
              Can everyone explain whether this release is ready?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ pt: 1 }}>
              A polished screen and a completed ticket each tell part of the
              story. A release review also needs the working outcome, its
              dependencies, and the verification behind it.
            </Typography>
            <Box
              sx={{
                mt: 3,
                p: 3,
                border: 1,
                borderColor: "divider",
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
                &quot;What works for these users? What blocks this candidate?
                What evidence would change our decision?&quot;
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", mt: 1, display: "block" }}
              >
                The questions a shared release assessment should answer
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
              02 · The thesis
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}
            >
              Start with a{" "}
              <Box component="span" sx={{ color: "primary.main" }}>
                capability supported by evidence
              </Box>
              .
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ pt: 1 }}>
              Describe an outcome people can verify, such as exporting an
              invoice or processing a partner event. Connect it to the screens,
              services, checks, and owners that explain its current state.
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
                body="No outbound calls except to your configured identity provider. No license server, phone-home, or analytics."
              />
              <Highlight
                icon={<LockOutlinedIcon />}
                title="One app + Postgres"
                body="Run the app with Postgres, your OIDC provider, and local persistent file storage."
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
            Create a product board, define its critical capabilities, and assess
            a candidate. Each person can inspect the evidence and dependencies
            that matter to their work.
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
              StateBoard · MIT · Show, don&apos;t tell.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Link
                href={`https://github.com/saschb2b/stateboard/releases/tag/v${version}`}
                target="_blank"
                rel="noopener"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="caption"
                  sx={{ "&:hover": { color: "primary.main" } }}
                >
                  v{version}
                </Typography>
              </Link>
              <Link
                href="/docs/changelog"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="caption"
                  sx={{ "&:hover": { color: "primary.main" } }}
                >
                  Changelog
                </Typography>
              </Link>
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
