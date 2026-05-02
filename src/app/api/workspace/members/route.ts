import { NextResponse } from "next/server";
import { listMembers } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { ok } from "@/lib/http";

export async function GET() {
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;
  return ok(await listMembers(member.workspaceId));
}
