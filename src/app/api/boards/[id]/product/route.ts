import { mutateProduct } from "@/lib/db";
import {
  releaseApi,
  productContext,
  productMutation,
  type ReleaseRouteContext,
} from "@/lib/release-api";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) =>
    productContext((await params).id, member.workspaceId),
  );
}

export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member, actor, body }) =>
    mutateProduct(
      member.workspaceId,
      (await params).id,
      productMutation(body),
      actor,
    ),
  );
}
