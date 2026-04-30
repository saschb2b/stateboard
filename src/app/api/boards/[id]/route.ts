import type { NextRequest } from "next/server";
import { deleteBoard, getBoardWithScreens, updateBoard } from "@/lib/db";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const result = getBoardWithScreens(id);
  if (!result) return notFound("board not found");
  return ok(result);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    description?: unknown;
  } | null;
  if (!body) return badRequest("invalid JSON body");

  const patch: { name?: string; description?: string | null } = {};
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) return badRequest("name cannot be empty");
    patch.name = trimmed;
  }
  if ("description" in body) {
    if (body.description === null) {
      patch.description = null;
    } else if (typeof body.description === "string") {
      patch.description = body.description.trim() || null;
    }
  }

  const updated = updateBoard(id, patch);
  if (!updated) return notFound("board not found");
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const removed = deleteBoard(id);
  if (!removed) return notFound("board not found");
  return noContent();
}
