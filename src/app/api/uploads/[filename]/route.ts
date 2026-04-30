import type { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { UPLOADS_DIR } from "@/lib/paths";
import { notFound } from "@/lib/http";

interface Ctx {
  params: Promise<{ filename: string }>;
}

const MIME_FOR_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Streams uploaded screenshots from the data dir.
 *
 * The filename is constrained to the same shape we generate: a 12-char
 * nanoid plus an allowlisted extension. Anything else is rejected so a
 * crafted request can't traverse outside UPLOADS_DIR.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { filename } = await params;
  if (!/^[A-Za-z0-9_-]{6,32}\.(png|jpe?g|webp|gif)$/.test(filename)) {
    return notFound();
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  // defense-in-depth: confirm the resolved path stays inside UPLOADS_DIR
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
    return notFound();
  }

  let buf: Buffer;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    return notFound();
  }

  const ext = filename.split(".").pop()!.toLowerCase();
  const mime = MIME_FOR_EXT[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "content-type": mime,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
