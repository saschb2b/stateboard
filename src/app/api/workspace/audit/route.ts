import { NextResponse } from "next/server";
import { listAuditLog } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import {
  parseAuditCursor,
  parseAuditFilters,
  parseAuditLimit,
} from "@/lib/audit";
import { ok } from "@/lib/http";

/**
 * List audit entries for the workspace, newest first. Owners only — the
 * workspace log includes member/admin events, which are sensitive. Filters and
 * keyset cursor arrive as query params. (Board-scoped history, visible to any
 * board member, lives at /api/boards/[id]/audit.)
 */
export async function GET(req: Request) {
  const member = await requireApiMember("owner");
  if (member instanceof NextResponse) return member;

  const url = new URL(req.url);
  const filters = parseAuditFilters(Object.fromEntries(url.searchParams));
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
