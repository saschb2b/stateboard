import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import {
  getBoard,
  getScreen,
  listRegions,
  updateScreenImage,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId } from "@/lib/ids";
import { ensureDataDirs, UPLOADS_DIR } from "@/lib/paths";
import { readImageDims } from "@/lib/image";
import { badRequest, notFound, ok, serverError } from "@/lib/http";

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

/**
 * Replace a screen's image with a freshly uploaded file, keeping the screen's
 * id, label, position, and all its regions. The new file gets a fresh name so
 * the image URL changes (no stale browser cache), and the old file is removed.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const screen = await getScreen(id);
  const board = screen ? await getBoard(screen.boardId) : null;
  if (!screen || !board || board.workspaceId !== member.workspaceId) {
    return notFound("screen not found");
  }

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
  const newFilename = `${newId()}.${ext}`;
  const oldFilename = screen.filename;

  ensureDataDirs();
  try {
    await fs.writeFile(path.join(UPLOADS_DIR, newFilename), buffer);
  } catch (err) {
    console.error("replace write failed", err);
    return serverError("failed to persist upload");
  }

  const updated = await updateScreenImage(
    id,
    {
      filename: newFilename,
      mimeType: dims.mimeType,
      width: dims.width,
      height: dims.height,
    },
    member.user.id,
  );
  if (!updated) return notFound("screen not found");

  // Best-effort cleanup of the replaced file; ignore if it is already gone.
  await fs
    .rm(path.join(UPLOADS_DIR, oldFilename), { force: true })
    .catch(() => {});

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "screen.update",
    targetType: "screen",
    targetId: id,
    meta: { replacedImage: true, from: oldFilename, to: newFilename },
  });

  const regions = await listRegions(id);
  return ok({ ...updated, regions });
}
