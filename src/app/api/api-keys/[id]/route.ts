import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiKey, revokeApiKey, writeAudit } from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import { bearerApiKey } from "@/lib/api-keys";
import { noContent, notFound } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  // Same rule as creation: a key can't revoke keys. Sign in for that.
  if (bearerApiKey(req.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "API keys can't manage API keys — sign in instead" },
      { status: 403 },
    );
  }
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const key = await getApiKey(id);
  // 404 (not 403) for foreign or already-revoked keys, matching the
  // cross-workspace convention elsewhere: don't confirm what exists.
  if (
    !key ||
    key.workspaceId !== member.workspaceId ||
    key.revokedAt !== null ||
    (key.userId !== member.user.id && member.role !== "owner")
  ) {
    return notFound("key not found");
  }

  await revokeApiKey(id);
  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "api_key.revoke",
    targetType: "api_key",
    targetId: id,
    meta: { name: key.name },
  });
  return noContent();
}
