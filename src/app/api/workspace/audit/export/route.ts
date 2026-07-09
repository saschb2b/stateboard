import { NextResponse } from "next/server";
import { listAuditLog } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { AUDIT_EXPORT_CAP, auditToCsv, parseAuditFilters } from "@/lib/audit";

/**
 * One-shot CSV export of the (filtered) audit log. Owners only.
 *
 * Returns a raw `text/csv` attachment rather than going through the JSON
 * `http.ts` helpers — this is a file download, not an API resource. Capped at
 * the most-recent {@link AUDIT_EXPORT_CAP} matching rows (the UI states this),
 * so a huge log can't build an unbounded string in memory.
 */
export async function GET(req: Request) {
  const member = await requireApiMember("owner");
  if (member instanceof NextResponse) return member;

  const url = new URL(req.url);
  const filters = parseAuditFilters(Object.fromEntries(url.searchParams));
  const { entries } = await listAuditLog(member.workspaceId, filters, {
    limit: AUDIT_EXPORT_CAP,
  });

  const csv = auditToCsv(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="stateboard-audit-${stamp}.csv"`,
    },
  });
}
