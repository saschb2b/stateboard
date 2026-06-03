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
import { readJsonBody } from "@/lib/read-json-body";
import {
  badRequest,
  notFound,
  ok,
  payloadTooLarge,
  serverError,
} from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Replace a screen's image with one already in the workspace, without
 * re-uploading: copy the source screen's image bytes into a fresh file for
 * this screen. The screen's id, label, position, and regions are kept; the
 * old file is removed. Both screens must belong to the caller's workspace.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const screen = await getScreen(id);
  const board = screen ? await getBoard(screen.boardId) : null;
  if (!screen || !board || board.workspaceId !== member.workspaceId) {
    return notFound("screen not found");
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  }
  const sourceId = parsed.value.sourceScreenId;
  if (typeof sourceId !== "string" || !sourceId) {
    return badRequest("sourceScreenId is required");
  }

  const source = await getScreen(sourceId);
  const sourceBoard = source ? await getBoard(source.boardId) : null;
  if (
    !source ||
    !sourceBoard ||
    sourceBoard.workspaceId !== member.workspaceId
  ) {
    return notFound("source screen not found");
  }

  const dot = source.filename.lastIndexOf(".");
  const ext = dot >= 0 ? source.filename.slice(dot + 1) : "png";
  const newFilename = `${newId()}.${ext}`;
  const oldFilename = screen.filename;

  ensureDataDirs();
  try {
    await fs.copyFile(
      path.join(UPLOADS_DIR, source.filename),
      path.join(UPLOADS_DIR, newFilename),
    );
  } catch (err) {
    console.error("replace-reuse copy failed", err);
    return serverError("failed to copy the screenshot");
  }

  const updated = await updateScreenImage(
    id,
    {
      filename: newFilename,
      mimeType: source.mimeType,
      width: source.width,
      height: source.height,
    },
    member.user.id,
  );
  if (!updated) return notFound("screen not found");

  await fs
    .rm(path.join(UPLOADS_DIR, oldFilename), { force: true })
    .catch(() => {});

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "screen.update",
    targetType: "screen",
    targetId: id,
    meta: { replacedImage: true, reusedFrom: source.id },
  });

  const regions = await listRegions(id);
  return ok({ ...updated, regions });
}
