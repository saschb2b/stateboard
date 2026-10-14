import type { ProductContext } from "./release-types";

export interface ScreenEditorContext {
  screenId?: string;
  regionId?: string;
  capabilityId?: string;
  review?: { label: string; href: string };
}

/** Accept context only from records already scoped to the current board. */
export function screenEditorContext(
  product: Pick<
    ProductContext,
    "board" | "screens" | "capabilities" | "releases"
  >,
  query: Record<string, string | string[] | undefined>,
): ScreenEditorContext {
  const screen = product.screens.find((item) => item.id === query.screen);
  const region = screen?.regions.find((item) => item.id === query.region);
  const capability = product.capabilities.find(
    (item) => item.id === query.capability && item.archivedAt === null,
  );
  const release = product.releases.find(
    (item) => item.id === query.release && item.boardId === product.board.id,
  );
  const params = new URLSearchParams({ view: "visual" });
  if (capability) params.set("capability", capability.id);
  return {
    screenId: screen?.id,
    regionId: region?.id,
    capabilityId: capability?.id,
    review: release
      ? {
          label: release.candidateLabel,
          href: `/boards/${product.board.id}/releases/${release.id}?${params}`,
        }
      : undefined,
  };
}
