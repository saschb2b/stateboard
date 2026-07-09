import { NextResponse } from "next/server";
import { getBoard, listAuditLog } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { AUDIT_EXPORT_CAP, auditToCsv, parseAuditFilters } from "@/lib/audit";
import { notFound } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * One-shot CSV export of a single board's (filtered) history. Visible to any
 * board member, matching the board-history view. Raw `text/csv` attachment
 * rather than the JSON helpers — it's a file download. Capped at the most-recent
 * {@link AUDIT_EXPORT_CAP} matching rows (the UI states this).
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
  const { entries } = await listAuditLog(member.workspaceId, filters, {
    limit: AUDIT_EXPORT_CAP,
  });

  const csv = auditToCsv(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="stateboard-board-history-${stamp}.csv"`,
    },
  });
}
