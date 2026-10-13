import { mutateProduct, readWorkspaceComponents } from "@/lib/db";
import { releaseApi, type ReleaseRouteContext } from "@/lib/release-api";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const { id } = await params;
    const component = (await readWorkspaceComponents(member.workspaceId)).find(
      (item) => item.id === id,
    );
    if (!component) throw new ReleaseError(404, "Component not found");
    return component;
  });
}
async function change(
  request: Request,
  { params }: ReleaseRouteContext,
  remove: boolean,
) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    if (typeof body.boardId !== "string")
      throw new ReleaseError(
        400,
        "boardId is required for the product context",
      );
    return mutateProduct(
      member.workspaceId,
      body.boardId,
      {
        type: remove ? "component.archive" : "component.update",
        id: (await params).id,
        data: body,
      },
      actor,
    );
  });
}
export async function PATCH(request: Request, context: ReleaseRouteContext) {
  return change(request, context, false);
}
export async function DELETE(request: Request, context: ReleaseRouteContext) {
  return change(request, context, true);
}
