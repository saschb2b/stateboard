import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoardBySlug, getBoardWithScreens } from "@/lib/db";
import { BoardShare } from "@/components/board-share";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const board = getBoardBySlug(slug);
  if (!board) return { title: "Not found" };
  return {
    title: board.name,
    description: board.description ?? undefined,
  };
}

export default async function BoardSharePage({ params }: PageProps) {
  const { slug } = await params;
  const board = getBoardBySlug(slug);
  if (!board) notFound();
  const result = getBoardWithScreens(board.id);
  if (!result) notFound();
  return <BoardShare board={result.board} screens={result.screens} />;
}
