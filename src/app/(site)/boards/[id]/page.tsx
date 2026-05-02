import { notFound } from "next/navigation";
import { getBoardWithScreens, listShareLinks } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { BoardEditor } from "@/components/board-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardEditorPage({ params }: PageProps) {
  const member = await requirePageMember("viewer");
  const { id } = await params;
  const result = await getBoardWithScreens(id);
  if (!result || result.board.workspaceId !== member.workspaceId) notFound();
  const links = await listShareLinks(id);
  return (
    <BoardEditor
      board={result.board}
      initialScreens={result.screens}
      initialShareLinks={links}
      viewer={member}
    />
  );
}
