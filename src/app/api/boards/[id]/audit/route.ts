import { NextResponse } from "next/server";
import { getBoard, listAuditLog } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import {
  parseAuditCursor,
  parseAuditFilters,
  parseAuditLimit,
} from "@/lib/audit";
import { notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * A board's own history, newest first. Visible to any workspace member (viewer
 * and up) — everyone with access to the board can see what changed on it. The
 * board id is applied as a hard scope, never a client-supplied filter, so this
 * can only ever return that board's rows. Member/admin events (no board_id)
 * never appear here; those stay in the owner-only /settings/audit view.
 */
export async function GET(req: Request, { params }: Ctx) {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) {
    return notFound("board not found");
  }

  const url = new URL(req.url);
  const filters = {
    ...parseAuditFilters(Object.fromEntries(url.searchParams)),
    boardId: id,
  };
  const limit = parseAuditLimit(url.searchParams.get("limit"));
  const cursor = parseAuditCursor(
    url.searchParams.get("before"),
    url.searchParams.get("beforeId"),
  );

  const result = await listAuditLog(member.workspaceId, filters, {
    cursor,
    limit,
  });
  return ok(result);
}
