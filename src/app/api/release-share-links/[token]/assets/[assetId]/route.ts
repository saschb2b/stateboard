import { NextResponse } from "next/server";
import { getPublicReleaseAsset } from "@/lib/db";
import { releaseErrorResponse } from "@/lib/release-api";
import { readReleaseAssetBytes } from "@/lib/release-assets";
import { notFound } from "@/lib/http";

interface Context {
  params: Promise<{ token: string; assetId: string }>;
}
export async function GET(_request: Request, { params }: Context) {
  try {
    const { token, assetId } = await params;
    const asset = await getPublicReleaseAsset(token, assetId);
    if (!asset) return notFound("Release image not found");
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
  } catch (error) {
    return releaseErrorResponse(error);
  }
}
