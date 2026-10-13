import { mutateProduct } from "@/lib/db";
import {
  releaseApi,
  productContext,
  type ReleaseRouteContext,
} from "@/lib/release-api";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await productContext((await params).id, member.workspaceId))
        .capabilities,
  );
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { created: true },
    async ({ member, actor, body }) =>
      mutateProduct(
        member.workspaceId,
        (await params).id,
        { type: "capability.create", data: body },
        actor,
      ),
  );
}
