import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { createScreen, getBoard, getScreen, writeAudit } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId } from "@/lib/ids";
import { ensureDataDirs, UPLOADS_DIR } from "@/lib/paths";
import { readJsonBody } from "@/lib/read-json-body";
import {
  badRequest,
  created,
  notFound,
  payloadTooLarge,
  serverError,
} from "@/lib/http";
import type { ScreenWithRegions } from "@/lib/types";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Add existing screenshots to this board without re-uploading: copy each
 * source screen's image bytes into a fresh file and create a new screen here.
 * Regions are intentionally NOT copied — you're reusing the picture, not the
 * annotations. Source screens must belong to the caller's workspace.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
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
  const ids = parsed.value.sourceScreenIds;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !ids.every((x) => typeof x === "string")
  ) {
    return badRequest("sourceScreenIds must be a non-empty array of ids");
  }

  ensureDataDirs();
  const added: ScreenWithRegions[] = [];
  try {
    for (const sourceId of ids as string[]) {
      const source = await getScreen(sourceId);
      const sourceBoard = source ? await getBoard(source.boardId) : null;
      // Confine to the caller's workspace; a missing/foreign screen is a 404.
      if (
        !source ||
        !sourceBoard ||
        sourceBoard.workspaceId !== member.workspaceId
      ) {
        return notFound(`screen not found: ${sourceId}`);
      }
      const dot = source.filename.lastIndexOf(".");
      const ext = dot >= 0 ? source.filename.slice(dot + 1) : "png";
      const newScreenId = newId();
      const newFilename = `${newScreenId}.${ext}`;
      await fs.copyFile(
        path.join(UPLOADS_DIR, source.filename),
        path.join(UPLOADS_DIR, newFilename),
      );
      const screen = await createScreen(
        {
          id: newScreenId,
          boardId,
          filename: newFilename,
          mimeType: source.mimeType,
          width: source.width,
          height: source.height,
          label: source.label,
        },
        member.user.id,
      );
      added.push({ ...screen, regions: [] });
      await writeAudit({
        workspaceId: member.workspaceId,
        actorId: member.user.id,
        action: "screen.create",
        targetType: "screen",
        targetId: screen.id,
        boardId,
        meta: { boardId, reusedFrom: source.id },
      });
    }
  } catch (err) {
    console.error("screen reuse failed", err);
    return serverError("failed to copy the selected screenshots");
  }

  return created(added);
}
