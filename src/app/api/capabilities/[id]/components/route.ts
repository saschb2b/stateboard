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
    ).capabilityComponents.filter((item) => item.capabilityId === id);
  });
}
async function change(
  request: Request,
  { params }: ReleaseRouteContext,
  remove: boolean,
) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    const { id } = await params;
    const boardId = await resolveCapabilityBoard(id, member.workspaceId);
    if (!boardId) throw new ReleaseError(404, "Capability not found");
    return mutateProduct(
      member.workspaceId,
      boardId,
      {
        type: remove
          ? "capability_component.delete"
          : "capability_component.put",
        data: { ...body, capabilityId: id },
      },
      actor,
    );
  });
}
export async function PUT(request: Request, context: ReleaseRouteContext) {
  return change(request, context, false);
}
export async function DELETE(request: Request, context: ReleaseRouteContext) {
  return change(request, context, true);
}
