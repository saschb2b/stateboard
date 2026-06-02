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
import {
  REGION_STATES,
  TEXT_LIMITS,
  type RegionState,
  checkTextLength,
  validateRegionBox,
} from "@/lib/types";
import { readJsonBody } from "@/lib/read-json-body";
import { badRequest, created, notFound, ok, payloadTooLarge } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

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

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  }
  const body = parsed.value as {
    x?: unknown;
    y?: unknown;
    w?: unknown;
    h?: unknown;
    state?: unknown;
    label?: unknown;
    notes?: unknown;
  };

  const box = validateRegionBox(body);
  if (!box.ok) return badRequest(box.error);

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

  const labelErr = checkTextLength(label, "label", TEXT_LIMITS.label);
  if (labelErr) return badRequest(labelErr);
  const notesErr = checkTextLength(notes, "notes", TEXT_LIMITS.notes);
  if (notesErr) return badRequest(notesErr);

  const region = await createRegion(
    {
      id: newId(),
      screenId,
      x: box.box.x,
      y: box.box.y,
      w: box.box.w,
      h: box.box.h,
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
