import { mutateRelease, readReleaseCheckRevisions } from "@/lib/db";
import {
  expectedRevision,
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const releaseId = new URL(request.url).searchParams.get("releaseId");
    if (!releaseId) throw new ReleaseError(400, "releaseId is required");
    return readReleaseCheckRevisions(
      member.workspaceId,
      releaseId,
      (await params).id,
    );
  });
}

export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { created: true },
    async ({ member, actor, body }) => {
      if (typeof body.releaseId !== "string")
        throw new ReleaseError(400, "releaseId is required");
      const detail = await releaseWorkspace(body.releaseId, member.workspaceId);
      const { id } = await params;
      if (!detail.checks.some((item) => item.id === id))
        throw new ReleaseError(404, "Check not found in this assessment");
      await mutateRelease(
        member.workspaceId,
        body.releaseId,
        {
          type: "check.revise",
          id,
          expectedRevision: expectedRevision(body),
          data: body,
        },
        actor,
      );
      return releaseWorkspace(body.releaseId, member.workspaceId);
    },
  );
}
export async function DELETE(
  request: Request,
  { params }: ReleaseRouteContext,
) {
  return releaseApi(request, {}, async ({ member, actor, body }) => {
    if (typeof body.releaseId !== "string")
      throw new ReleaseError(400, "releaseId is required");
    await mutateRelease(
      member.workspaceId,
      body.releaseId,
      {
        type: "check.archive",
        id: (await params).id,
        expectedRevision: expectedRevision(body),
        data: body,
      },
      actor,
    );
    return releaseWorkspace(body.releaseId, member.workspaceId);
  });
}
