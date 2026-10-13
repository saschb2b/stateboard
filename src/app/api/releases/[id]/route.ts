import { mutateRelease } from "@/lib/db";
import {
  releaseApi,
  releaseWorkspace,
  releaseMutation,
  type ReleaseRouteContext,
} from "@/lib/release-api";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) =>
    releaseWorkspace((await params).id, member.workspaceId),
  );
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    const { id } = await params;
    await mutateRelease(member.workspaceId, id, releaseMutation(body), actor);
    return releaseWorkspace(id, member.workspaceId);
  });
}
