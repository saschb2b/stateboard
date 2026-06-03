import { notFound } from "next/navigation";
import { getBoardWithScreens, listShareLinks } from "@/lib/db";
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
  const result = await getBoardWithScreens(id);
  if (!result || result.board.workspaceId !== member.workspaceId) notFound();
  const shareLinks = await listShareLinks(id);
  const stats = {
    screens: result.screens.length,
    regions: result.screens.reduce((n, s) => n + s.regions.length, 0),
    shareLinks: shareLinks.filter((l) => l.revokedAt === null).length,
  };
  return (
    <BoardSettings
      board={result.board}
      viewer={member}
      initialShareLinks={shareLinks}
      stats={stats}
    />
  );
}
