import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  deleteBoard,
  getBoard,
  getBoardWithScreens,
  updateBoard,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { TEXT_LIMITS, checkTextLength } from "@/lib/types";
import { readJsonBody } from "@/lib/read-json-body";
import {
  badRequest,
  noContent,
  notFound,
  ok,
  payloadTooLarge,
} from "@/lib/http";
import path from "node:path";
import fs from "node:fs/promises";
import { UPLOADS_DIR } from "@/lib/paths";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function ensureBoardInWorkspace(
  id: string,
  workspaceId: string,
): Promise<boolean> {
  const board = await getBoard(id);
  return !!board && board.workspaceId === workspaceId;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureBoardInWorkspace(id, member.workspaceId))) {
    return notFound("board not found");
  }
  const result = await getBoardWithScreens(id);
  if (!result) return notFound("board not found");
  return ok(result);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureBoardInWorkspace(id, member.workspaceId))) {
    return notFound("board not found");
  }
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  }
  const body = parsed.value as { name?: unknown; description?: unknown };

  const patch: { name?: string; description?: string | null } = {};
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) return badRequest("name cannot be empty");
    const nameErr = checkTextLength(trimmed, "name", TEXT_LIMITS.name);
    if (nameErr) return badRequest(nameErr);
    patch.name = trimmed;
  }
  if ("description" in body) {
    if (body.description === null) {
      patch.description = null;
    } else if (typeof body.description === "string") {
      const description = body.description.trim() || null;
      const descriptionErr = checkTextLength(
        description,
        "description",
        TEXT_LIMITS.description,
      );
      if (descriptionErr) return badRequest(descriptionErr);
      patch.description = description;
    }
  }

  const updated = await updateBoard(id, patch, member.user.id);
  if (!updated) return notFound("board not found");

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.update",
    targetType: "board",
    targetId: id,
    boardId: id,
    meta: patch,
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureBoardInWorkspace(id, member.workspaceId))) {
    return notFound("board not found");
  }

  // Collect the image filenames before the cascade deletes the screen rows;
  // the DB cascades screens + regions, but the files on disk don't.
  const detail = await getBoardWithScreens(id);
  const removed = await deleteBoard(id);
  if (!removed) return notFound("board not found");

  if (detail) {
    await Promise.all(
      detail.screens.map((s) =>
        fs
          .rm(path.join(UPLOADS_DIR, s.filename), { force: true })
          .catch(() => {}),
      ),
    );
  }

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.delete",
    targetType: "board",
    targetId: id,
    boardId: id,
  });

  return noContent();
}
