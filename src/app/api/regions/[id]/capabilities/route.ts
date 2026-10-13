import { mutateProduct, resolveRegionBoard } from "@/lib/db";
import {
  releaseApi,
  productContext,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const { id } = await params;
    const boardId = await resolveRegionBoard(id, member.workspaceId);
    if (!boardId) throw new ReleaseError(404, "Region not found");
    return (
      await productContext(boardId, member.workspaceId)
    ).regionCapabilities.filter((item) => item.regionId === id);
  });
}
async function change(
  request: Request,
  { params }: ReleaseRouteContext,
  remove: boolean,
) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    const { id } = await params;
    const boardId = await resolveRegionBoard(id, member.workspaceId);
    if (!boardId) throw new ReleaseError(404, "Region not found");
    return mutateProduct(
      member.workspaceId,
      boardId,
      {
        type: remove ? "region_capability.delete" : "region_capability.put",
        data: { ...body, regionId: id },
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
