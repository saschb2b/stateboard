import { NextResponse } from "next/server";
import { listWorkspaceScreens } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { ok } from "@/lib/http";

/** Every screen in the workspace (with its board name) for the reuse picker. */
export async function GET() {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;
  return ok(await listWorkspaceScreens(member.workspaceId));
}
