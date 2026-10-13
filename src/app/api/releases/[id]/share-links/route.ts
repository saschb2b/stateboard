import { createReleaseShare } from "@/lib/db";
import {
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import { buildReleaseProjection } from "@/lib/release-projection";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await releaseWorkspace((await params).id, member.workspaceId)).shares,
  );
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { role: "owner", humanOnly: true, created: true },
    async ({ member, actor, body }) => {
      const { id } = await params;
      const detail = await releaseWorkspace(id, member.workspaceId);
      const decision = detail.decisions.find(
        (item) => item.id === body.decisionId,
      );
      if (!decision) throw new ReleaseError(404, "Recorded decision not found");
      const projection = buildReleaseProjection(
        decision,
        body.projectionInput as Parameters<typeof buildReleaseProjection>[1],
      );
      return createReleaseShare(
        member.workspaceId,
        id,
        decision.id,
        projection,
        actor,
      );
    },
  );
}
