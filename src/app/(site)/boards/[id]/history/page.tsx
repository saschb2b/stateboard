import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoard, listAuditActors, listAuditLog } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { AuditLog } from "@/components/workspace/audit-log";

/** Rows per page / "Load more" step. */
const PAGE_SIZE = 50;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const member = await requirePageMember("viewer");
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) {
    return { title: "Not found" };
  }
  return { title: `${board.name} · History` };
}

export default async function BoardHistoryPage({ params }: PageProps) {
  const member = await requirePageMember("viewer");
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) notFound();

  const [{ entries, nextCursor }, actors] = await Promise.all([
    listAuditLog(member.workspaceId, { boardId: id }, { limit: PAGE_SIZE }),
    listAuditActors(member.workspaceId, id),
  ]);

  return (
    <AuditLog
      viewer={member}
      initialEntries={entries}
      initialCursor={nextCursor}
      actors={actors}
      pageSize={PAGE_SIZE}
      listEndpoint={`/api/boards/${id}/audit`}
      exportEndpoint={`/api/boards/${id}/audit/export`}
      backHref={`/boards/${id}`}
      crumb="History"
      heading={`${board.name} · History`}
      subtitle="Every change to this board's screens, regions, and share links, newest first. Visible to anyone with access to this board."
    />
  );
}
