import type { Metadata } from "next";
import { BoardShare } from "@/components/board-share";
import { getDemoBoard } from "@/lib/demo-data";

/**
 * Permanent example board, served from memory at /v/demo.
 *
 * Lives next to /v/[slug] in the route tree but takes precedence over the
 * dynamic segment (Next.js prefers literal paths). Never touches the DB.
 */

export const metadata: Metadata = {
  title: "Example board",
  description:
    "An example StateBoard with two screens and twelve regions across the three states. Use it as a reference whenever you're not sure how to annotate.",
};

export default function DemoBoardPage() {
  const { board, screens } = getDemoBoard();
  return <BoardShare board={board} screens={screens} />;
}
