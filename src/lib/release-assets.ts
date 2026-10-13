import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { newId } from "./ids";
import { readImageDims } from "./image";
import { isAllowedUploadFilename } from "./uploads";
import { ensureDataDirs, RELEASE_ASSETS_DIR, UPLOADS_DIR } from "./paths";
import { ReleaseError, type ReleaseAsset } from "./release-types";
import type { ScreenWithRegions } from "./types";

export const MAX_RELEASE_IMAGE_BYTES = 25 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
function assetPath(filename: string): string {
  if (!isAllowedUploadFilename(filename))
    throw new ReleaseError(404, "Image not found");
  return path.join(RELEASE_ASSETS_DIR, filename);
}
export async function storeReleaseImage(
  buffer: Buffer,
  label: string,
  assessmentId: string,
): Promise<ReleaseAsset> {
  if (buffer.length > MAX_RELEASE_IMAGE_BYTES)
    throw new ReleaseError(400, "Image exceeds 25 MB");
  const dims = readImageDims(buffer);
  if (
    !dims ||
    dims.width < 1 ||
    dims.height < 1 ||
    dims.width > 20000 ||
    dims.height > 20000 ||
    dims.width * dims.height > 100_000_000
  ) {
    throw new ReleaseError(
      400,
      "Upload a valid PNG, JPEG, GIF or WebP image with reasonable dimensions",
    );
  }
  if (!label.trim() || label.length > 200)
    throw new ReleaseError(400, "Image label must contain 1–200 characters");
  const extension = extensions[dims.mimeType];
  if (!extension) throw new ReleaseError(400, "Unsupported image type");
  const id = newId();
  const asset: ReleaseAsset = {
    id,
    assessmentId,
    decisionId: null,
    filename: `${id}.${extension}`,
    mimeType: dims.mimeType,
    width: dims.width,
    height: dims.height,
    sizeBytes: buffer.length,
    digest: createHash("sha256").update(buffer).digest("hex"),
    label: label.trim(),
    createdAt: Date.now(),
  };
  ensureDataDirs();
  await fs.writeFile(assetPath(asset.filename), buffer, { flag: "wx" });
  return asset;
}
export async function readReleaseAssetBytes(
  asset: ReleaseAsset,
): Promise<Buffer> {
  try {
    const bytes = await fs.readFile(assetPath(asset.filename));
    if (
      bytes.length !== asset.sizeBytes ||
      createHash("sha256").update(bytes).digest("hex") !== asset.digest
    ) {
      throw new ReleaseError(404, "Retained image is unavailable");
    }
    return bytes;
  } catch {
    throw new ReleaseError(404, "Image not found");
  }
}
export async function cleanupReleaseAssets(
  assets: ReleaseAsset[],
): Promise<void> {
  await Promise.all(
    assets.map((asset) =>
      fs.rm(assetPath(asset.filename), { force: true }).catch(() => {}),
    ),
  );
}
/** Local maintenance; old unreferenced files only, with a dry run by default. */
export async function cleanupUnreferencedReleaseAssets(
  referenced: string[],
  before: number,
  remove = false,
): Promise<string[]> {
  ensureDataDirs();
  const retained = new Set(referenced);
  const candidates: string[] = [];
  for (const entry of await fs.readdir(RELEASE_ASSETS_DIR, {
    withFileTypes: true,
  })) {
    if (
      !entry.isFile() ||
      !isAllowedUploadFilename(entry.name) ||
      retained.has(entry.name)
    )
      continue;
    const filename = assetPath(entry.name);
    const stat = await fs.stat(filename);
    if (stat.mtimeMs >= before) continue;
    candidates.push(entry.name);
    if (remove) await fs.rm(filename, { force: true });
  }
  return candidates;
}

/** Caller holds source locks. Copies are independent of mutable board screenshots. */
export async function captureDecisionAssets(
  screens: ScreenWithRegions[],
  assessmentId: string,
  decisionId: string,
) {
  const assets: ReleaseAsset[] = [];
  const retained: ScreenWithRegions[] = [];
  try {
    for (const screen of screens) {
      if (!isAllowedUploadFilename(screen.filename))
        throw new ReleaseError(
          400,
          "Only uploaded raster screenshots can be retained",
        );
      const bytes = await fs.readFile(path.join(UPLOADS_DIR, screen.filename));
      const asset = await storeReleaseImage(
        bytes,
        screen.label ?? "Screenshot",
        assessmentId,
      );
      asset.decisionId = decisionId;
      assets.push(asset);
      retained.push({
        ...screen,
        filename: asset.filename,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        mediaUrl: `/api/release-assets/${asset.id}`,
        regions: screen.regions.map((region) => ({ ...region })),
      });
    }
    return { screens: retained, assets };
  } catch (error) {
    await cleanupReleaseAssets(assets);
    throw error;
  }
}
