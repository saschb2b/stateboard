import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createBoard, createShareLink, listBoards, writeAudit } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId, newShareToken } from "@/lib/ids";
import { badRequest, created, ok } from "@/lib/http";

export async function GET() {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;
  return ok(await listBoards(member.workspaceId));
}

export async function POST(req: NextRequest) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    description?: unknown;
  } | null;
  if (!body) return badRequest("invalid JSON body");

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return badRequest("name is required");

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  const board = await createBoard({
    id: newId(),
    workspaceId: member.workspaceId,
    name,
    description,
    createdBy: member.user.id,
  });

  // Auto-mint one share link on creation so the editor's "Share" button
  // works immediately. Additional links can be minted via /api/boards/:id/share-links.
  await createShareLink({
    token: newShareToken(),
    boardId: board.id,
    label: null,
    createdBy: member.user.id,
  });

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.create",
    targetType: "board",
    targetId: board.id,
    meta: { name },
  });

  return created(board);
}
