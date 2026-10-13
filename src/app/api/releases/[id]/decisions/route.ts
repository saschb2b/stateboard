import { recordReleaseDecision } from "@/lib/db";
import {
  expectedRevision,
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import type { DecisionInput } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await releaseWorkspace((await params).id, member.workspaceId)).decisions,
  );
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { role: "owner", humanOnly: true, created: true },
    async ({ member, actor, body }) => {
      const { id } = await params;
      await recordReleaseDecision(
        member.workspaceId,
        id,
        { ...body, expectedRevision: expectedRevision(body) } as DecisionInput,
        actor,
      );
      return releaseWorkspace(id, member.workspaceId);
    },
  );
}
