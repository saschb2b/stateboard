import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Keep old v0 routes working in case anyone copied a /b/* or /v/* link
  // before the rename to /boards/* and /share/*.
  async redirects() {
    return [
      { source: "/b/:id", destination: "/boards/:id", permanent: true },
      { source: "/v/:slug", destination: "/share/:slug", permanent: true },
    ];
  },
};

export default withMDX(nextConfig);
