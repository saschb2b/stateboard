import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  deleteRegion,
  getBoard,
  getRegion,
  getScreen,
  updateRegion,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import {
  REGION_STATES,
  TEXT_LIMITS,
  type Region,
  type RegionState,
  checkTextLength,
  validateRegionBox,
} from "@/lib/types";
import { readJsonBody } from "@/lib/read-json-body";
import {
  badRequest,
  noContent,
  notFound,
  ok,
  payloadTooLarge,
} from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function loadRegionInWorkspace(
  id: string,
  workspaceId: string,
): Promise<{ region: Region; boardId: string } | null> {
  const region = await getRegion(id);
  if (!region) return null;
  const screen = await getScreen(region.screenId);
  if (!screen) return null;
  const board = await getBoard(screen.boardId);
  if (!board || board.workspaceId !== workspaceId) return null;
  return { region, boardId: screen.boardId };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const owned = await loadRegionInWorkspace(id, member.workspaceId);
  if (!owned) return notFound("region not found");
  const existing = owned.region;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  }
  const body = parsed.value;

  const patch: Parameters<typeof updateRegion>[1] = {};

  // Validate the *resulting* geometry, not each field in isolation: a PATCH
  // that only moves x or shrinks w could otherwise push the box off-screen or
  // to zero area — invariants POST enforces but this path used to skip.
  if ("x" in body || "y" in body || "w" in body || "h" in body) {
    const box = validateRegionBox({
      x: "x" in body ? body.x : existing.x,
      y: "y" in body ? body.y : existing.y,
      w: "w" in body ? body.w : existing.w,
      h: "h" in body ? body.h : existing.h,
    });
    if (!box.ok) return badRequest(box.error);
    if ("x" in body) patch.x = box.box.x;
    if ("y" in body) patch.y = box.box.y;
    if ("w" in body) patch.w = box.box.w;
    if ("h" in body) patch.h = box.box.h;
  }
  if ("state" in body) {
    if (
      typeof body.state !== "string" ||
      !REGION_STATES.includes(body.state as RegionState)
    ) {
      return badRequest(`state must be one of ${REGION_STATES.join(", ")}`);
    }
    patch.state = body.state as RegionState;
  }
  if ("label" in body) {
    if (body.label === null) patch.label = null;
    else if (typeof body.label === "string") {
      const label = body.label.trim() || null;
      const labelErr = checkTextLength(label, "label", TEXT_LIMITS.label);
      if (labelErr) return badRequest(labelErr);
      patch.label = label;
    }
  }
  if ("notes" in body) {
    if (body.notes === null) patch.notes = null;
    else if (typeof body.notes === "string") {
      const notes = body.notes.trim() || null;
      const notesErr = checkTextLength(notes, "notes", TEXT_LIMITS.notes);
      if (notesErr) return badRequest(notesErr);
      patch.notes = notes;
    }
  }

  const updated = await updateRegion(id, patch, member.user.id);
  if (!updated) return notFound("region not found");

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "region.update",
    targetType: "region",
    targetId: id,
    boardId: owned.boardId,
    meta: patch,
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const owned = await loadRegionInWorkspace(id, member.workspaceId);
  if (!owned) {
    return notFound("region not found");
  }
  if (!(await deleteRegion(id, member.user.id))) {
    return notFound("region not found");
  }

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "region.delete",
    targetType: "region",
    targetId: id,
    boardId: owned.boardId,
  });

  return noContent();
}
