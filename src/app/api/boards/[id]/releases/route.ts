import { createReleaseAssessment } from "@/lib/db";
import {
  releaseApi,
  productContext,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import type { CreateAssessmentInput } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await productContext((await params).id, member.workspaceId)).releases,
  );
}
export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { created: true },
    async ({ member, actor, body }) => {
      const detail = await createReleaseAssessment(
        member.workspaceId,
        (await params).id,
        body as unknown as CreateAssessmentInput,
        actor,
      );
      return releaseWorkspace(detail.assessment.id, member.workspaceId);
    },
  );
}
