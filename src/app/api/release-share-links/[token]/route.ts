import { getPublicReleaseShare, revokeReleaseShare } from "@/lib/db";
import {
  releaseApi,
  releaseErrorResponse,
  type ReleaseTokenContext,
} from "@/lib/release-api";
import { notFound, ok } from "@/lib/http";

export async function GET(_request: Request, { params }: ReleaseTokenContext) {
  try {
    const share = await getPublicReleaseShare((await params).token);
    if (!share) return notFound("Release share link not found");
    return ok(share.projection, {
      headers: {
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return releaseErrorResponse(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: ReleaseTokenContext,
) {
  return releaseApi(
    request,
    { role: "owner", humanOnly: true, readBody: false },
    async ({ member, actor }) =>
      revokeReleaseShare(member.workspaceId, (await params).token, actor),
  );
}
