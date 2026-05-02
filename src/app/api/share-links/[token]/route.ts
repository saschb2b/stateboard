import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBoard, getShareLink, revokeShareLink, writeAudit } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { noContent, notFound } from "@/lib/http";

interface Ctx {
  params: Promise<{ token: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { token } = await params;
  const link = await getShareLink(token);
  if (!link || link.revokedAt !== null) return notFound("link not found");

  const board = await getBoard(link.boardId);
  if (!board || board.workspaceId !== member.workspaceId) {
    return notFound("link not found");
  }

  await revokeShareLink(token);
  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "share_link.revoke",
    targetType: "share_link",
    targetId: token,
    meta: { boardId: link.boardId },
  });
  return noContent();
}
