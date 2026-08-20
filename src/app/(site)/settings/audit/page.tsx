import type { Metadata } from "next";
import { listAuditActors, listAuditLog } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { AuditLog } from "@/components/workspace/audit-log";

export const metadata: Metadata = { title: "Audit log" };

/** Rows per page / "Load more" step. */
const PAGE_SIZE = 50;

export default async function AuditPage() {
  const me = await requirePageMember("owner");
  const [{ entries, nextCursor }, actors] = await Promise.all([
    listAuditLog(me.workspaceId, {}, { limit: PAGE_SIZE }),
    listAuditActors(me.workspaceId),
  ]);
  return (
    <AuditLog
      viewer={me}
      initialEntries={entries}
      initialCursor={nextCursor}
      actors={actors}
      pageSize={PAGE_SIZE}
      listEndpoint="/api/workspace/audit"
      exportEndpoint="/api/workspace/audit/export"
      crumb="Audit log"
      heading="Audit log"
      subtitle="Every board, screen, region, share-link, and member change, newest first. Visible to owners only."
    />
  );
}
