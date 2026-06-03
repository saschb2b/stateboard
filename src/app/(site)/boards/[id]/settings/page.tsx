import { notFound } from "next/navigation";
import { getBoard, listShareLinks } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { BoardSettings } from "@/components/board-settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardSettingsPage({ params }: PageProps) {
  // Settings are all mutations, so editors and owners only; viewers get
  // bounced to /boards by requirePageMember.
  const member = await requirePageMember("editor");
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) notFound();
  const shareLinks = await listShareLinks(id);
  return (
    <BoardSettings
      board={board}
      viewer={member}
      initialShareLinks={shareLinks}
    />
  );
}
