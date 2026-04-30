import type { NextRequest } from "next/server";
import { deleteRegion, updateRegion } from "@/lib/db";
import { REGION_STATES, type RegionState } from "@/lib/types";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

const isFiniteIn01 = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
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

  const updated = updateRegion(id, patch);
  if (!updated) return notFound("region not found");
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!deleteRegion(id)) return notFound("region not found");
  return noContent();
}
