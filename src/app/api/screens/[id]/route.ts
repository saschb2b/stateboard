import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import {
  deleteScreen,
  getBoard,
  getScreen,
  updateScreen,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { UPLOADS_DIR } from "@/lib/paths";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function loadOwnedScreen(id: string, workspaceId: string) {
  const screen = await getScreen(id);
  if (!screen) return null;
  const board = await getBoard(screen.boardId);
  if (!board || board.workspaceId !== workspaceId) return null;
  return screen;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const owned = await loadOwnedScreen(id, member.workspaceId);
  if (!owned) return notFound("screen not found");

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

  const updated = await updateScreen(id, patch, member.user.id);
  if (!updated) return notFound("screen not found");

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "screen.update",
    targetType: "screen",
    targetId: id,
    meta: patch,
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const existing = await loadOwnedScreen(id, member.workspaceId);
  if (!existing) return notFound("screen not found");

  await deleteScreen(id, member.user.id);
  // best-effort cleanup of the on-disk file
  try {
    await fs.unlink(path.join(UPLOADS_DIR, existing.filename));
  } catch {
    // file already gone — fine
  }

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "screen.delete",
    targetType: "screen",
    targetId: id,
  });

  return noContent();
}
