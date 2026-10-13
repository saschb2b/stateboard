import { mutateRelease } from "@/lib/db";
import {
  expectedRevision,
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const detail = await releaseWorkspace(
      (await params).id,
      member.workspaceId,
    );
    const checkId = new URL(request.url).searchParams.get("checkId");
    return checkId
      ? detail.evidence.filter((item) => item.checkId === checkId)
      : detail.evidence;
  });
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { created: true },
    async ({ member, actor, body }) => {
      const { id } = await params;
      await mutateRelease(
        member.workspaceId,
        id,
        {
          type: "evidence.create",
          expectedRevision: expectedRevision(body),
          data: body,
        },
        actor,
      );
      return releaseWorkspace(id, member.workspaceId);
    },
  );
}
