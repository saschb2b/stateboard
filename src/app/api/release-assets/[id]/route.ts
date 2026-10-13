import { NextResponse } from "next/server";
import { getReleaseAsset } from "@/lib/db";
import { releaseApi, type ReleaseRouteContext } from "@/lib/release-api";
import { readReleaseAssetBytes } from "@/lib/release-assets";
import { ReleaseError } from "@/lib/release-types";

export async function GET(request: Request, { params }: ReleaseRouteContext) {
  return releaseApi(request, {}, async ({ member }) => {
    const asset = await getReleaseAsset((await params).id, member.workspaceId);
    if (!asset) throw new ReleaseError(404, "Release image not found");
    const bytes = await readReleaseAssetBytes(asset);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": asset.mimeType,
        "content-length": String(bytes.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow",
        "referrer-policy": "no-referrer",
      },
    });
  });
}
