import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createShareLink,
  getBoard,
  listShareLinks,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newShareToken } from "@/lib/ids";
import { badRequest, created, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) {
    return notFound("board not found");
  }
  return ok(await listShareLinks(id));
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) {
    return notFound("board not found");
  }

  const body = (await req.json().catch(() => ({}))) as { label?: unknown };
  let label: string | null = null;
  if ("label" in body) {
    if (typeof body.label !== "string" && body.label !== null) {
      return badRequest("label must be a string or null");
    }
    label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim()
        : null;
  }

  const link = await createShareLink({
    token: newShareToken(),
    boardId: id,
    label,
    createdBy: member.user.id,
  });

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "share_link.create",
    targetType: "share_link",
    targetId: link.token,
    meta: { boardId: id, label },
  });

  return created(link);
}
