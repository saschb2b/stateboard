import type { NextRequest } from "next/server";
import { createBoard, listBoards } from "@/lib/db";
import { newId, newSlug } from "@/lib/ids";
import { badRequest, created, ok } from "@/lib/http";

export async function GET() {
  return ok(listBoards());
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    description?: unknown;
  } | null;
  if (!body) return badRequest("invalid JSON body");

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return badRequest("name is required");

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  const board = createBoard({
    id: newId(),
    slug: newSlug(),
    name,
    description,
  });
  return created(board);
}
