#!/usr/bin/env node
/**
 * Strip runtime-only routes from the working tree so `next build` with
 * `output: "export"` succeeds for the GitHub Pages demo.
 *
 * Runs ONLY in CI under .github/workflows/pages.yml. It mutates the
 * checked-out repo destructively, which is fine on a throwaway runner
 * but would be terrible to run locally. The CI workflow guards against
 * accidental local runs by checking PAGES_BUILD=1.
 */

import { existsSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (process.env.PAGES_BUILD !== "1") {
  console.error(
    "Refusing to run: pages-prebuild.mjs mutates the working tree.",
  );
  console.error("Set PAGES_BUILD=1 to confirm (the Pages workflow does this).");
  process.exit(2);
}

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");

const REMOVE = [
  // All API route handlers — incompatible with `output: "export"`.
  "src/app/api",
  // The editor page — reads Postgres + requires auth.
  "src/app/(site)/boards/[id]",
  // The dynamic public share view — same problem. /share/demo stays.
  "src/app/(site)/share/[token]",
  // Auth surfaces — Better Auth needs a Node runtime.
  "src/app/(site)/sign-in",
  "src/app/(site)/settings",
  // Next 16 "proxy" (auth gate) — also Node-only.
  "src/proxy.ts",
];

for (const rel of REMOVE) {
  const abs = path.join(repoRoot, rel);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    console.log("removed " + rel);
  } else {
    console.log("skip   " + rel + " (not present)");
  }
}

// Replace the boards-list page with a stub that points visitors at the
// example or self-hosting. We can't read the user's DB on Pages — better
// to be honest about it than to render a half-broken empty list.
const stub = `import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import GitHubIcon from "@mui/icons-material/GitHub";
import { AppHeader } from "@/components/app-header";

export default function DemoBoardsPage() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em" }}>
            DEMO MODE
          </Typography>
          <Typography variant="h3" sx={{ maxWidth: 600 }}>
            The editor needs a server. This deployment is read-only.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 540 }}>
            Open the example board to see what a finished StateBoard looks like —
            two screens, twelve regions, and Present mode all work here. To create
            your own boards, run StateBoard yourself (it&apos;s one Docker container).
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
            <Link href="/share/demo" style={{ textDecoration: "none" }}>
              <Button variant="contained" color="primary" endIcon={<OpenInNewIcon />} sx={{ px: 3, py: 1.25 }}>
                Open the example
              </Button>
            </Link>
            <Button
              variant="outlined"
              component="a"
              href="https://github.com/saschb2b/stateboard"
              target="_blank"
              rel="noopener"
              startIcon={<GitHubIcon />}
              sx={{ px: 3, py: 1.25 }}
            >
              Self-host on GitHub
            </Button>
          </Stack>
          <Box sx={{ pt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              docker run --rm -p 3000:3000 -v stateboard-data:/data ghcr.io/saschb2b/stateboard
            </Typography>
          </Box>
        </Stack>
      </Container>
    </>
  );
}
`;
writeFileSync(
  path.join(repoRoot, "src/app/(site)/boards/page.tsx"),
  stub,
  "utf8",
);
console.log("wrote  src/app/(site)/boards/page.tsx (demo stub)");

console.log("\npages-prebuild done. Now run: STATEBOARD_PAGES=1 pnpm build");
