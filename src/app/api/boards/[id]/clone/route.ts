import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import {
  createBoard,
  createRegion,
  createScreen,
  createShareLink,
  getBoardWithScreens,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId, newShareToken } from "@/lib/ids";
import { TEXT_LIMITS } from "@/lib/types";
import { ensureDataDirs, UPLOADS_DIR } from "@/lib/paths";
import { created, notFound, serverError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Deep-copy a board: a new board, every screen (with its own copy of the image
 * bytes, so the clone is fully independent of the original), every region, and
 * a fresh share link. Handy when a new board is mostly the same as an old one
 * and only a screen or two needs swapping.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const source = await getBoardWithScreens(id);
  if (!source || source.board.workspaceId !== member.workspaceId) {
    return notFound("board not found");
  }

  const name = `${source.board.name} (copy)`.slice(0, TEXT_LIMITS.name);
  const board = await createBoard({
    id: newId(),
    workspaceId: member.workspaceId,
    name,
    description: source.board.description,
    createdBy: member.user.id,
  });

  ensureDataDirs();
  try {
    // Screens come back in position order, and createScreen assigns the next
    // position per insert, so cloning in sequence preserves the original order.
    for (const screen of source.screens) {
      const dot = screen.filename.lastIndexOf(".");
      const ext = dot >= 0 ? screen.filename.slice(dot + 1) : "png";
      const newScreenId = newId();
      const newFilename = `${newScreenId}.${ext}`;
      await fs.copyFile(
        path.join(UPLOADS_DIR, screen.filename),
        path.join(UPLOADS_DIR, newFilename),
      );
      const newScreen = await createScreen(
        {
          id: newScreenId,
          boardId: board.id,
          filename: newFilename,
          mimeType: screen.mimeType,
          width: screen.width,
          height: screen.height,
          label: screen.label,
        },
        member.user.id,
      );
      for (const region of screen.regions) {
        await createRegion(
          {
            id: newId(),
            screenId: newScreen.id,
            x: region.x,
            y: region.y,
            w: region.w,
            h: region.h,
            state: region.state,
            label: region.label,
            notes: region.notes,
          },
          member.user.id,
        );
      }
    }
  } catch (err) {
    console.error("board clone failed", err);
    return serverError("failed to copy the board's screens");
  }

  await createShareLink({
    token: newShareToken(),
    boardId: board.id,
    label: null,
    createdBy: member.user.id,
  });

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.clone",
    targetType: "board",
    targetId: board.id,
    boardId: board.id,
    meta: { sourceBoardId: source.board.id, screens: source.screens.length },
  });

  return created(board);
}
