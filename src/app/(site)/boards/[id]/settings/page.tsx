import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoard, getBoardWithScreens, listShareLinks } from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { BoardSettings } from "@/components/board-settings";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const member = await requirePageMember("editor");
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) {
    return { title: "Not found" };
  }
  return { title: `Settings · ${board.name}` };
}

export default async function BoardSettingsPage({
  params,
  searchParams,
}: PageProps) {
  // Settings are all mutations, so editors and owners only; viewers get
  // bounced to /boards by requirePageMember.
  const member = await requirePageMember("editor");
  const { id } = await params;
  const { section } = await searchParams;
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
      initialSection={section === "sharing" ? "sharing" : "general"}
    />
  );
}
