import { notFound } from "next/navigation";
import { getBoardWithScreens } from "@/lib/db";
import { BoardEditor } from "@/components/board-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardEditorPage({ params }: PageProps) {
  const { id } = await params;
  const result = getBoardWithScreens(id);
  if (!result) notFound();
  return <BoardEditor board={result.board} initialScreens={result.screens} />;
}
