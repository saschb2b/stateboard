import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoardWithScreens, getShareLink } from "@/lib/db";
import { BoardShare } from "@/components/board-share";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Read-only public share view, addressed by a revocable token.
 *
 * Anyone with the token can read the board — that's the artifact thesis.
 * Revoking the token from the editor immediately 404s this page; that's
 * the recovery path for "this link leaked".
 */

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const link = await getShareLink(token);
  if (!link || link.revokedAt !== null) return { title: "Not found" };
  const result = await getBoardWithScreens(link.boardId);
  if (!result) return { title: "Not found" };
  return {
    title: result.board.name,
    description: result.board.description ?? undefined,
  };
}

export default async function BoardSharePage({ params }: PageProps) {
  const { token } = await params;
  const link = await getShareLink(token);
  if (!link || link.revokedAt !== null) notFound();
  const result = await getBoardWithScreens(link.boardId);
  if (!result) notFound();
  return <BoardShare board={result.board} screens={result.screens} />;
}
