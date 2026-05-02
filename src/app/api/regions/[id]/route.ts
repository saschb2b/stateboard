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
import { REGION_STATES, type RegionState } from "@/lib/types";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

const isFiniteIn01 = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

async function ensureRegionInWorkspace(
  id: string,
  workspaceId: string,
): Promise<boolean> {
  const region = await getRegion(id);
  if (!region) return false;
  const screen = await getScreen(region.screenId);
  if (!screen) return false;
  const board = await getBoard(screen.boardId);
  return !!board && board.workspaceId === workspaceId;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await ensureRegionInWorkspace(id, member.workspaceId))) {
    return notFound("region not found");
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return badRequest("invalid JSON body");

  const patch: Parameters<typeof updateRegion>[1] = {};

  for (const k of ["x", "y", "w", "h"] as const) {
    if (k in body) {
      if (!isFiniteIn01(body[k])) {
        return badRequest(`${k} must be a number in [0, 1]`);
      }
      patch[k] = body[k];
    }
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
  if (!(await ensureRegionInWorkspace(id, member.workspaceId))) {
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
