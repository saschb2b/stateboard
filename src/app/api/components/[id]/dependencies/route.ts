import { mutateProduct } from "@/lib/db";
import {
  releaseApi,
  productContext,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const boardId = new URL(request.url).searchParams.get("boardId");
    if (!boardId)
      throw new ReleaseError(
        400,
        "boardId is required for the product context",
      );
    const product = await productContext(boardId, member.workspaceId);
    const { id } = await params;
    if (!product.components.some((item) => item.id === id))
      throw new ReleaseError(404, "Component not found");
    return product.dependencies.filter((item) => item.consumerId === id);
  });
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { created: true },
    async ({ member, actor, body }) => {
      if (typeof body.boardId !== "string")
        throw new ReleaseError(
          400,
          "boardId is required for the product context",
        );
      return mutateProduct(
        member.workspaceId,
        body.boardId,
        {
          type: "dependency.create",
          data: { ...body, consumerId: (await params).id },
        },
        actor,
      );
    },
  );
}
export async function DELETE(
  request: Request,
  { params }: ReleaseRouteContext,
) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    if (
      typeof body.boardId !== "string" ||
      typeof body.dependencyId !== "string"
    )
      throw new ReleaseError(400, "boardId and dependencyId are required");
    return mutateProduct(
      member.workspaceId,
      body.boardId,
      {
        type: "dependency.delete",
        id: body.dependencyId,
        data: { consumerId: (await params).id },
      },
      actor,
    );
  });
}
