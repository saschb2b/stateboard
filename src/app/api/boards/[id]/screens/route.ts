import type { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { createScreen, getBoard } from "@/lib/db";
import { newId } from "@/lib/ids";
import { ensureDataDirs, UPLOADS_DIR } from "@/lib/paths";
import { readImageDims } from "@/lib/image";
import { badRequest, created, notFound, serverError } from "@/lib/http";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: boardId } = await params;
  if (!getBoard(boardId)) return notFound("board not found");

  const form = await req.formData().catch(() => null);
  if (!form) return badRequest("expected multipart/form-data");

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("missing file field");
  if (file.size === 0) return badRequest("file is empty");
  if (file.size > MAX_BYTES) return badRequest("file too large (max 25 MB)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const dims = readImageDims(buffer);
  if (!dims) return badRequest("unrecognized image format");
  if (!ALLOWED_MIME.has(dims.mimeType)) {
    return badRequest(`unsupported image type: ${dims.mimeType}`);
  }

  const ext =
    dims.mimeType === "image/png"
      ? "png"
      : dims.mimeType === "image/jpeg"
        ? "jpg"
        : dims.mimeType === "image/webp"
          ? "webp"
          : "gif";

  const screenId = newId();
  const filename = `${screenId}.${ext}`;

  ensureDataDirs();
  try {
    await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  } catch (err) {
    console.error("upload write failed", err);
    return serverError("failed to persist upload");
  }

  const labelRaw = form.get("label");
  const label =
    typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : null;

  const screen = createScreen({
    id: screenId,
    boardId,
    filename,
    mimeType: dims.mimeType,
    width: dims.width,
    height: dims.height,
    label,
  });

  return created(screen);
}
