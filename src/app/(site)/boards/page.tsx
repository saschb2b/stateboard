import type { Metadata } from "next";
import {
  getBoardWithScreens,
  listBoards,
  listShareLinks,
  readLatestReleaseOverviews,
} from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { BoardList, type BoardListItem } from "@/components/board/board-list";

export const metadata: Metadata = { title: "Boards" };

export default async function BoardsPage() {
  const member = await requirePageMember("viewer");
  const boards = await listBoards(member.workspaceId);
  const overviews = await readLatestReleaseOverviews(
    member.workspaceId,
    boards.map((board) => board.id),
  );
  // A dynamic server component renders once per request, so reading the
  // wall clock here is correct and stable — not the impure-render hazard the
  // purity rule guards against (which targets unpredictable client re-renders).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // Each card shows a stable share-link token so the editor's "Share"
  // button works without an extra request. Take the most recently-created
  // active token per board (boards always have at least one because
  // POST /api/boards mints one on create). Screens drive the preview
  // carousel; the region states roll up into the card's status summary.
  const items: BoardListItem[] = await Promise.all(
    boards.map(async (b) => {
      const [links, full] = await Promise.all([
        listShareLinks(b.id),
        getBoardWithScreens(b.id),
      ]);
      const active = links.find((l) => l.revokedAt === null);
      // Keep regions on the screens: the card paints them as a mini-board and
      // rolls them up into the status counts.
      const screens = full?.screens ?? [];
      const totals = { shipped: 0, mock: 0, missing: 0 };
      for (const s of screens) for (const r of s.regions) totals[r.state]++;
      return {
        board: b,
        shareToken: active?.token ?? null,
        screens,
        totals,
        updatedAt: b.updatedAt,
        now,
        releaseOverview: overviews[b.id],
      };
    }),
  );

  return <BoardList initialItems={items} viewer={member} />;
}
