import { listBoards } from "@/lib/db";
import { BoardList } from "@/components/board-list";

export const dynamic = "force-dynamic";

export default function BoardsPage() {
  const boards = listBoards();
  return <BoardList initialBoards={boards} />;
}
