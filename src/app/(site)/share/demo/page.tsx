import type { Metadata } from "next";
import { BoardShare } from "@/components/board/board-share";
import { getDemoBoard } from "@/lib/demo-data";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

/**
 * Permanent example board, served from memory at /share/demo.
 *
 * Lives next to /share/[slug] in the route tree but takes precedence over
 * the dynamic segment (Next.js prefers literal paths). Never touches the DB.
 */

export const metadata: Metadata = {
  title: "Example board",
  description:
    "An example StateBoard with two screens and twelve regions across the three states. Use it as a reference whenever you're not sure how to annotate.",
  openGraph: {
    title: "Example board",
    description:
      "An example StateBoard with two screens and twelve regions across the three states. Use it as a reference whenever you're not sure how to annotate.",
    siteName: "StateBoard",
    type: "website",
  },
};

export default function DemoBoardPage() {
  const { board, screens } = getDemoBoard();
  return (
    <>
      <Box
        sx={{
          textAlign: "center",
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Link href="/share/demo/releases" style={{ textDecoration: "none" }}>
          <Button>Explore the release-readiness example →</Button>
        </Link>
      </Box>
      <BoardShare board={board} screens={screens} />
    </>
  );
}
