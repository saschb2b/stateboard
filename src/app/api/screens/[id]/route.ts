import type { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { deleteScreen, getScreen, updateScreen } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/paths";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    label?: unknown;
  } | null;
  if (!body) return badRequest("invalid JSON body");

  const patch: { label?: string | null } = {};
  if ("label" in body) {
    if (body.label === null) patch.label = null;
    else if (typeof body.label === "string") {
      patch.label = body.label.trim() || null;
    }
  }

  const updated = updateScreen(id, patch);
  if (!updated) return notFound("screen not found");
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const existing = getScreen(id);
  if (!existing) return notFound("screen not found");
  deleteScreen(id);
  // best-effort cleanup of the on-disk file
  try {
    await fs.unlink(path.join(UPLOADS_DIR, existing.filename));
  } catch {
    // file already gone — fine
  }
  return noContent();
}
