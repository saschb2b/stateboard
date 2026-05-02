import { listBoards, listShareLinks } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { BoardList, type BoardListItem } from "@/components/board-list";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const member = await requirePageMember("viewer");
  const boards = await listBoards(member.workspaceId);

  // Each card shows a stable share-link token so the editor's "Share"
  // button works without an extra request. Take the most recently-created
  // active token per board (boards always have at least one because
  // POST /api/boards mints one on create).
  const items: BoardListItem[] = await Promise.all(
    boards.map(async (b) => {
      const links = await listShareLinks(b.id);
      const active = links.find((l) => l.revokedAt === null);
      return { board: b, shareToken: active?.token ?? null };
    }),
  );

  return <BoardList initialItems={items} viewer={member} />;
}
