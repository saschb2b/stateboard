import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { createScreen, getBoard, reorderScreens, writeAudit } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId } from "@/lib/ids";
import { ensureDataDirs, UPLOADS_DIR } from "@/lib/paths";
import { readImageDims } from "@/lib/image";
import { readJsonBody } from "@/lib/read-json-body";
import {
  badRequest,
  created,
  notFound,
  ok,
  payloadTooLarge,
  serverError,
} from "@/lib/http";

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
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id: boardId } = await params;
  const board = await getBoard(boardId);
  if (!board || board.workspaceId !== member.workspaceId) {
    return notFound("board not found");
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

  const screen = await createScreen(
    {
      id: screenId,
      boardId,
      filename,
      mimeType: dims.mimeType,
      width: dims.width,
      height: dims.height,
      label,
    },
    member.user.id,
  );

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "screen.create",
    targetType: "screen",
    targetId: screen.id,
    boardId,
    meta: { boardId, filename },
  });

  return created(screen);
}

// Reorder a board's screens from a fully-specified id list (drag-and-drop in
// the editor). The body is { order: string[] } listing every screen once.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id: boardId } = await params;
  const board = await getBoard(boardId);
  if (!board || board.workspaceId !== member.workspaceId) {
    return notFound("board not found");
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  }
  const order = parsed.value.order;
  if (!Array.isArray(order) || !order.every((x) => typeof x === "string")) {
    return badRequest("order must be an array of screen ids");
  }

  const screens = await reorderScreens(
    boardId,
    order as string[],
    member.user.id,
  );
  if (!screens) {
    return badRequest(
      "order must list each of this board's screens exactly once",
    );
  }

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "screen.reorder",
    targetType: "board",
    targetId: boardId,
    boardId,
    meta: { order },
  });

  return ok(screens);
}
