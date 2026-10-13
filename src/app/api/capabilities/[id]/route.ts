import { mutateProduct, resolveCapabilityBoard } from "@/lib/db";
import {
  releaseApi,
  productContext,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const { id } = await params;
    const boardId = await resolveCapabilityBoard(id, member.workspaceId);
    if (!boardId) throw new ReleaseError(404, "Capability not found");
    return (
      await productContext(boardId, member.workspaceId)
    ).capabilities.find((item) => item.id === id);
  });
}
export async function PATCH(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    const { id } = await params;
    const boardId = await resolveCapabilityBoard(id, member.workspaceId);
    if (!boardId) throw new ReleaseError(404, "Capability not found");
    return mutateProduct(
      member.workspaceId,
      boardId,
      { type: "capability.update", id, data: body },
      actor,
    );
  });
}
export async function DELETE(
  request: Request,
  { params }: ReleaseRouteContext,
) {
  return releaseApi(request, { readBody: false }, async ({ member, actor }) => {
    const { id } = await params;
    const boardId = await resolveCapabilityBoard(id, member.workspaceId);
    if (!boardId) throw new ReleaseError(404, "Capability not found");
    return mutateProduct(
      member.workspaceId,
      boardId,
      { type: "capability.archive", id, data: {} },
      actor,
    );
  });
}
