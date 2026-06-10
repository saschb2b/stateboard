import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoardWithScreens, getShareLink } from "@/lib/db";
import { timeAgo } from "@/lib/time";
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
    // Explicit OG tags so the link unfurls with the board's own name and
    // description in Slack / Teams / email, where these links get passed
    // around. No og:image — the board content stays behind the token.
    openGraph: {
      title: result.board.name,
      description: result.board.description ?? undefined,
      siteName: "StateBoard",
      type: "website",
    },
  };
}

export default async function BoardSharePage({ params }: PageProps) {
  const { token } = await params;
  const link = await getShareLink(token);
  if (!link || link.revokedAt !== null) notFound();
  const result = await getBoardWithScreens(link.boardId);
  if (!result) notFound();
  // A force-dynamic server component renders once per request, so reading the
  // wall clock here is correct and stable — not the impure-render hazard the
  // purity rule guards against (which targets unpredictable client re-renders).
  // eslint-disable-next-line react-hooks/purity
  const updatedLabel = timeAgo(result.board.updatedAt, Date.now());
  return (
    <BoardShare
      board={result.board}
      screens={result.screens}
      updatedLabel={updatedLabel}
    />
  );
}
