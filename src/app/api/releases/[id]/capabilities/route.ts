import { mutateRelease } from "@/lib/db";
import {
  expectedRevision,
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await releaseWorkspace((await params).id, member.workspaceId)).scope,
  );
}
export async function PUT(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    const { id } = await params;
    await mutateRelease(
      member.workspaceId,
      id,
      {
        type: "scope.put",
        expectedRevision: expectedRevision(body),
        data: body,
      },
      actor,
    );
    return releaseWorkspace(id, member.workspaceId);
  });
}
