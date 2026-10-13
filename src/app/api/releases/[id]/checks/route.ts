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
      (await releaseWorkspace((await params).id, member.workspaceId)).checks,
  );
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
          type: "check.create",
          expectedRevision: expectedRevision(body),
          data: body,
        },
        actor,
      );
      return releaseWorkspace(id, member.workspaceId);
    },
  );
}
