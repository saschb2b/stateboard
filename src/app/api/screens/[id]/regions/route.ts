import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createRegion,
  getBoard,
  getScreen,
  listRegions,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { newId } from "@/lib/ids";
import { REGION_STATES, type RegionState } from "@/lib/types";
import { badRequest, created, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

const isFiniteIn01 = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

async function loadOwnedScreen(id: string, workspaceId: string) {
  const screen = await getScreen(id);
  if (!screen) return null;
  const board = await getBoard(screen.boardId);
  if (!board || board.workspaceId !== workspaceId) return null;
  return screen;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  if (!(await loadOwnedScreen(id, member.workspaceId))) {
    return notFound("screen not found");
  }
  return ok(await listRegions(id));
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("editor");
  if (member instanceof NextResponse) return member;

  const { id: screenId } = await params;
  if (!(await loadOwnedScreen(screenId, member.workspaceId))) {
    return notFound("screen not found");
  }

  const body = (await req.json().catch(() => null)) as {
    x?: unknown;
    y?: unknown;
    w?: unknown;
    h?: unknown;
    state?: unknown;
    label?: unknown;
    notes?: unknown;
  } | null;
  if (!body) return badRequest("invalid JSON body");

  if (
    !isFiniteIn01(body.x) ||
    !isFiniteIn01(body.y) ||
    !isFiniteIn01(body.w) ||
    !isFiniteIn01(body.h)
  ) {
    return badRequest("x, y, w, h must each be numbers in [0, 1]");
  }
  if (body.x + body.w > 1.0001 || body.y + body.h > 1.0001) {
    return badRequest("region extends beyond screen bounds");
  }
  if (body.w <= 0 || body.h <= 0) {
    return badRequest("region must have non-zero size");
  }
  if (
    typeof body.state !== "string" ||
    !REGION_STATES.includes(body.state as RegionState)
  ) {
    return badRequest(`state must be one of ${REGION_STATES.join(", ")}`);
  }

  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const region = await createRegion(
    {
      id: newId(),
      screenId,
      x: body.x,
      y: body.y,
      w: body.w,
      h: body.h,
      state: body.state as RegionState,
      label,
      notes,
    },
    member.user.id,
  );

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "region.create",
    targetType: "region",
    targetId: region.id,
    meta: { screenId, state: region.state },
  });

  return created(region);
}
