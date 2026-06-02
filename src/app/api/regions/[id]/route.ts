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
  type Region,
  type RegionState,
  validateRegionBox,
} from "@/lib/types";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function loadRegionInWorkspace(
  id: string,
  workspaceId: string,
): Promise<Region | null> {
  const region = await getRegion(id);
  if (!region) return null;
  const screen = await getScreen(region.screenId);
  if (!screen) return null;
  const board = await getBoard(screen.boardId);
  if (!board || board.workspaceId !== workspaceId) return null;
  return region;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const existing = await loadRegionInWorkspace(id, member.workspaceId);
  if (!existing) return notFound("region not found");

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return badRequest("invalid JSON body");

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
      patch.label = body.label.trim() || null;
    }
  }
  if ("notes" in body) {
    if (body.notes === null) patch.notes = null;
    else if (typeof body.notes === "string") {
      patch.notes = body.notes.trim() || null;
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
    meta: patch,
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await loadRegionInWorkspace(id, member.workspaceId))) {
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
  });

  return noContent();
}
