import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBoard,
  readProductContext,
  getUserRefs,
  listShareLinks,
} from "@/lib/db";
import { requirePageMember } from "@/lib/auth-helpers";
import { screenEditorContext } from "@/lib/screen-editor-context";
import { BoardEditor } from "@/components/board/board-editor";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Title the tab with the board's name so open editors stay tellable apart. */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const member = await requirePageMember("viewer");
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.workspaceId !== member.workspaceId) {
    return { title: "Not found" };
  }
  return { title: board.name };
}

export default async function BoardEditorPage({
  params,
  searchParams,
}: PageProps) {
  const member = await requirePageMember("viewer");
  const { id } = await params;
  const result = await readProductContext(id, member.workspaceId);
  if (!result || result.board.workspaceId !== member.workspaceId) notFound();
  const links = await listShareLinks(id);

  // Resolve every author id on the board (creator, last editor, and each
  // region's editor) to a name once, so the editor can render "who wrote this"
  // attribution without a per-region lookup. Keyed by id for O(1) access.
  const refs = await getUserRefs([
    result.board.createdBy,
    result.board.updatedBy,
    ...result.screens.flatMap((s) => s.regions.map((r) => r.updatedBy)),
  ]);
  const authors = Object.fromEntries(refs.map((r) => [r.id, r]));
  // A dynamic server component renders once per request, so reading the
  // wall clock here is correct and stable — not the impure-render hazard the
  // purity rule guards against (which targets unpredictable client re-renders).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <BoardEditor
      board={result.board}
      initialScreens={result.screens}
      initialCapabilities={result.capabilities}
      initialRegionCapabilities={result.regionCapabilities}
      initialContext={screenEditorContext(result, await searchParams)}
      initialShareLinks={links}
      viewer={member}
      authors={authors}
      now={now}
    />
  );
}
