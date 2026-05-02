import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  deleteBoard,
  getBoard,
  getBoardWithScreens,
  updateBoard,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function ensureBoardInWorkspace(
  id: string,
  workspaceId: string,
): Promise<boolean> {
  const board = await getBoard(id);
  return !!board && board.workspaceId === workspaceId;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureBoardInWorkspace(id, member.workspaceId))) {
    return notFound("board not found");
  }
  const result = await getBoardWithScreens(id);
  if (!result) return notFound("board not found");
  return ok(result);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureBoardInWorkspace(id, member.workspaceId))) {
    return notFound("board not found");
  }
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

  const updated = await updateBoard(id, patch, member.user.id);
  if (!updated) return notFound("board not found");

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.update",
    targetType: "board",
    targetId: id,
    meta: patch,
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureBoardInWorkspace(id, member.workspaceId))) {
    return notFound("board not found");
  }
  const removed = await deleteBoard(id);
  if (!removed) return notFound("board not found");

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.delete",
    targetType: "board",
    targetId: id,
  });

  return noContent();
}
