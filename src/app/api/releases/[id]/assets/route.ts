import { createReleaseAsset } from "@/lib/db";
import {
  expectedRevision,
  releaseApi,
  releaseWorkspace,
  type ReleaseRouteContext,
} from "@/lib/release-api";
import { cleanupReleaseAssets, storeReleaseImage } from "@/lib/release-assets";
import { readMultipartBody } from "@/lib/read-multipart-body";
import { ReleaseError } from "@/lib/release-types";
import { payloadTooLarge } from "@/lib/http";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    {},
    async ({ member }) =>
      (await releaseWorkspace((await params).id, member.workspaceId)).assets,
  );
}

export async function POST(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(
    request,
    { readBody: false, created: true },
    async ({ member, actor }) => {
      const { id } = await params;
      await releaseWorkspace(id, member.workspaceId);
      const form = await readMultipartBody(
        request,
        25 * 1024 * 1024 + 64 * 1024,
      );
      if (form === "too_large")
        return payloadTooLarge("Image upload exceeds 25 MB");
      if (!form) throw new ReleaseError(400, "Expected multipart form data");
      const file = form.get("file");
      if (!(file instanceof File))
        throw new ReleaseError(400, "A file is required");
      const label = form.get("label");
      if (typeof label !== "string" || !label.trim() || label.length > 200)
        throw new ReleaseError(
          400,
          "An image label of 1–200 characters is required",
        );
      const revisionField = form.get("expectedRevision");
      const revision = expectedRevision({
        expectedRevision:
          typeof revisionField === "string" && /^\d+$/.test(revisionField)
            ? Number(revisionField)
            : null,
      });
      const asset = await storeReleaseImage(
        Buffer.from(await file.arrayBuffer()),
        label.trim(),
        id,
      );
      try {
        await createReleaseAsset(
          member.workspaceId,
          id,
          asset,
          actor,
          revision,
        );
      } catch (error) {
        await cleanupReleaseAssets([asset]);
        throw error;
      }
      return releaseWorkspace(id, member.workspaceId);
    },
  );
}
