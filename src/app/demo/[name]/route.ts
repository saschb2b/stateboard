import type { NextRequest } from "next/server";
import { getDemoSvg } from "@/lib/demo-data";
import { notFound } from "@/lib/http";

interface Ctx {
  params: Promise<{ name: string }>;
}

/**
 * Serves the static demo screens at `/demo/{name}.svg`.
 *
 * The bytes come from `src/lib/demo-data.ts`, never from disk — the demo
 * is part of the binary, not the user's data. Filename is constrained to
 * a strict allowlist so a crafted request can't probe arbitrary paths.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { name } = await params;
  const match = /^([a-z][a-z0-9-]{0,30})\.svg$/.exec(name);
  if (!match) return notFound();
  const svg = getDemoSvg(match[1]!);
  if (!svg) return notFound();
  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
