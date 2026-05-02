import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  countOwners,
  getMembership,
  removeMember,
  updateMemberRole,
  writeAudit,
} from "@/lib/db";
import { requireApiMember, isWorkspaceRole } from "@/lib/auth-helpers";
import { badRequest, noContent, notFound, ok } from "@/lib/http";

interface Ctx {
  params: Promise<{ userId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("owner");
  if (member instanceof NextResponse) return member;

  const { userId } = await params;
  const target = await getMembership(member.workspaceId, userId);
  if (!target) return notFound("member not found");

  const body = (await req.json().catch(() => null)) as {
    role?: unknown;
  } | null;
  if (!body || !isWorkspaceRole(body.role)) {
    return badRequest("role must be one of owner, editor, viewer");
  }

  // Don't let the last owner demote themselves and leave the workspace
  // ownerless. Promoting a second owner first is the recovery path.
  if (target.role === "owner" && body.role !== "owner") {
    const owners = await countOwners(member.workspaceId);
    if (owners <= 1) {
      return badRequest(
        "Promote another member to owner before changing this owner's role.",
      );
    }
  }

  const updated = await updateMemberRole({
    workspaceId: member.workspaceId,
    userId,
    role: body.role,
  });
  if (!updated) return notFound("member not found");

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "member.role_change",
    targetType: "user",
    targetId: userId,
    meta: { from: target.role, to: body.role },
  });

  return ok({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const member = await requireApiMember("owner");
  if (member instanceof NextResponse) return member;

  const { userId } = await params;
  const target = await getMembership(member.workspaceId, userId);
  if (!target) return notFound("member not found");

  if (target.role === "owner") {
    const owners = await countOwners(member.workspaceId);
    if (owners <= 1) {
      return badRequest(
        "Cannot remove the last owner. Promote another member first.",
      );
    }
  }

  // We don't delete the underlying auth user — only their membership.
  // Their content history (created_by / updated_by FKs) sticks around.
  await removeMember({ workspaceId: member.workspaceId, userId });

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "member.remove",
    targetType: "user",
    targetId: userId,
  });

  return noContent();
}
