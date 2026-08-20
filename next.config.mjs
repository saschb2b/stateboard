import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// STATEBOARD_PAGES=1 swaps the build into a static-export configuration
// for the GitHub Pages demo. The Pages workflow runs a prebuild step
// that physically removes the runtime-only routes (api/, editor, dynamic
// share view) before this config takes effect — see .github/workflows/pages.yml.
const isPagesExport = process.env.STATEBOARD_PAGES === "1";

// Pages serves the site under /<repo>/, so we need a basePath. Override
// with STATEBOARD_BASE_PATH if you fork the repo under a different name.
const pagesBasePath = process.env.STATEBOARD_BASE_PATH ?? "/stateboard";

/** @type {import('next').NextConfig} */
const nextConfig = isPagesExport
  ? {
      output: "export",
      basePath: pagesBasePath,
      assetPrefix: pagesBasePath,
      trailingSlash: true,
      // Pages has no image optimizer.
      images: { unoptimized: true },
      // Next handles basePath for <Link> and _next/* assets, but raw
      // <img src="/foo.svg"> stays as-is, and metadata.icons doesn't get
      // it either. Expose the basePath as a NEXT_PUBLIC_* env so those
      // call sites (demo-data.ts, app-header.tsx, docs-layout-config.tsx,
      // app/layout.tsx) can prepend it. Inlined at build time.
      env: {
        NEXT_PUBLIC_BASE_PATH: pagesBasePath,
      },
    }
  : {
      output: "standalone",
      // Instant Navigations (Next 16.3): explicit caching via "use cache",
      // per-route loading shells prefetched to the client, SPA-feel
      // navigations. Deliberately absent from the Pages-export branch above —
      // the static demo has no server to stream from.
      cacheComponents: true,
      partialPrefetching: true,
      // Better Auth's kysely adapter ships dialect modules for every backend
      // it supports (bun:sqlite, D1, better-sqlite3, …). We only use Postgres,
      // but the bundler eagerly resolves all of them and Turbopack (Next 16.2.7+)
      // hard-fails on the uninstalled sqlite drivers. Keep these external so the
      // build doesn't traverse into the unused dialects — they're never loaded at
      // runtime for the Postgres path. (Fixes the better-sqlite3 peer issue, #39.)
      serverExternalPackages: ["better-auth", "@better-auth/kysely-adapter"],
      // Keep old v0 routes working in case anyone copied a /b/* or /v/*
      // link before the rename to /boards/* and /share/*.
      async redirects() {
        return [
          { source: "/b/:id", destination: "/boards/:id", permanent: true },
          { source: "/v/:slug", destination: "/share/:slug", permanent: true },
        ];
      },
    };

export default withMDX(nextConfig);
