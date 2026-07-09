import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createBoard, createShareLink, listBoards, writeAudit } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId, newShareToken } from "@/lib/ids";
import { TEXT_LIMITS, checkTextLength } from "@/lib/types";
import { readJsonBody } from "@/lib/read-json-body";
import { badRequest, created, ok, payloadTooLarge } from "@/lib/http";

export async function GET() {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;
  return ok(await listBoards(member.workspaceId));
}

export async function POST(req: NextRequest) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  }
  const body = parsed.value as { name?: unknown; description?: unknown };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return badRequest("name is required");
  const nameErr = checkTextLength(name, "name", TEXT_LIMITS.name);
  if (nameErr) return badRequest(nameErr);

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const descriptionErr = checkTextLength(
    description,
    "description",
    TEXT_LIMITS.description,
  );
  if (descriptionErr) return badRequest(descriptionErr);

  const board = await createBoard({
    id: newId(),
    workspaceId: member.workspaceId,
    name,
    description,
    createdBy: member.user.id,
  });

  // Auto-mint one share link on creation so the editor's "Share" button
  // works immediately. Additional links can be minted via /api/boards/:id/share-links.
  await createShareLink({
    token: newShareToken(),
    boardId: board.id,
    label: null,
    createdBy: member.user.id,
  });

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "board.create",
    targetType: "board",
    targetId: board.id,
    boardId: board.id,
    meta: { name },
  });

  return created(board);
}
