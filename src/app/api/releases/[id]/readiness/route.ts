import {
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await releaseWorkspace((await params).id, member.workspaceId)).readiness,
  );
}
