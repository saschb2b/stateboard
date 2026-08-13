import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createApiKey,
  listApiKeys,
  listWorkspaceApiKeys,
  writeAudit,
} from "@/lib/db";
import { requireApiMember } from "@/lib/auth-helpers";
import {
  bearerApiKey,
  generateApiKey,
  parseExpiresInDays,
} from "@/lib/api-keys";
import { newId } from "@/lib/ids";
import {
  TEXT_LIMITS,
  checkTextLength,
  isWorkspaceRole,
  minRole,
  type WorkspaceRole,
} from "@/lib/types";
import { badRequest, created, ok, payloadTooLarge } from "@/lib/http";
import { readJsonBody } from "@/lib/read-json-body";

/**
 * Key management is session-only: a leaked agent key must not be able to
 * mint or enumerate keys and turn one credential into many.
 */
function rejectKeyAuth(req: NextRequest): NextResponse | null {
  if (bearerApiKey(req.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "API keys can't manage API keys — sign in instead" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const rejected = rejectKeyAuth(req);
  if (rejected) return rejected;

  // ?scope=workspace is the owner-only governance view: every key in the
  // workspace with its owner attached. Default scope is your own keys.
  if (req.nextUrl.searchParams.get("scope") === "workspace") {
    const owner = await requireApiMember("owner");
    if (owner instanceof NextResponse) return owner;
    return ok(await listWorkspaceApiKeys(owner.workspaceId));
  }

  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;
  return ok(await listApiKeys(member.workspaceId, member.user.id));
}

export async function POST(req: NextRequest) {
  const rejected = rejectKeyAuth(req);
  if (rejected) return rejected;
  const member = await requireApiMember("viewer");
  if (member instanceof NextResponse) return member;

  const parsed = await readJsonBody(req);
  if (!parsed.ok)
    return parsed.tooLarge
      ? payloadTooLarge()
      : badRequest("invalid JSON body");
  const body = parsed.value as {
    name?: unknown;
    role?: unknown;
    expiresInDays?: unknown;
  };

  if (typeof body.name !== "string" || !body.name.trim()) {
    return badRequest("name is required");
  }
  const name = body.name.trim();
  const nameErr = checkTextLength(name, "name", TEXT_LIMITS.name);
  if (nameErr) return badRequest(nameErr);

  let role: WorkspaceRole = member.role;
  if ("role" in body && body.role !== undefined) {
    if (!isWorkspaceRole(body.role)) {
      return badRequest("role must be one of owner, editor, viewer");
    }
    // A member can't mint a key above their own station.
    role = minRole(body.role, member.role);
  }

  // Absent → 90-day default; explicit null → never expires.
  const expiry = parseExpiresInDays(body.expiresInDays, Date.now());
  if (!expiry.ok) return badRequest(expiry.error);

  const secret = generateApiKey();
  const apiKey = await createApiKey({
    id: newId(),
    workspaceId: member.workspaceId,
    userId: member.user.id,
    name,
    keyHash: secret.keyHash,
    keyPrefix: secret.keyPrefix,
    role,
    expiresAt: expiry.expiresAt,
  });

  await writeAudit({
    workspaceId: member.workspaceId,
    actorId: member.user.id,
    action: "api_key.create",
    targetType: "api_key",
    targetId: apiKey.id,
    meta: { name, role, expiresAt: expiry.expiresAt },
  });

  // The one and only time the plaintext leaves the server.
  return created({ ...apiKey, key: secret.key });
}
