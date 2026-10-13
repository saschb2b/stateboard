import "server-only";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { bearerApiKey, hashApiKey } from "./api-keys";
import { getCurrentMember, type CurrentMember } from "./auth";
import { findMemberByApiKeyHash } from "./db";
import { meetsRole, minRole, type WorkspaceRole } from "./types";
import { forbidden, unauthorized } from "./http";
import { isTrustedMutationOrigin } from "./release-security";

export interface ReleaseApiMember extends CurrentMember {
  credentialKind: "session" | "api_key";
  credentialId: string | null;
}

/** Reuse live membership checks, while requiring browser sessions for decisions. */
export async function requireReleaseApiMember(
  request: Request,
  required: WorkspaceRole = "viewer",
  humanOnly = false,
): Promise<ReleaseApiMember | NextResponse> {
  const authorization = request.headers.get("authorization");
  if (humanOnly && authorization !== null) {
    return forbidden(
      "A current owner browser session is required for this action",
    );
  }
  const key = bearerApiKey(authorization);
  if (authorization !== null && !key)
    return unauthorized("Invalid API credential");
  const member = await requireApiMember(required);
  if (member instanceof NextResponse) return member;
  const credentialKind = member.credentialKind;
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    credentialKind === "session" &&
    !isTrustedMutationOrigin(
      request.url,
      request.headers,
      process.env.STATEBOARD_BASE_URL ?? process.env.BETTER_AUTH_URL,
    )
  ) {
    return forbidden(
      "Mutation origin does not match this StateBoard deployment",
    );
  }
  return { ...member, credentialKind };
}

/**
 * Helpers shared between server components and API routes.
 *
 * `requirePageMember` is for server components: redirects to /sign-in
 * when there's no session. `requireApiMember` is for route handlers:
 * returns a 401/403 NextResponse when access fails so the caller can
 * `if (member instanceof NextResponse) return member;`.
 *
 * API routes accept two credentials: the browser's session cookie, and
 * `Authorization: Bearer sbk_…` API keys for agents/scripts (see
 * lib/api-keys.ts). Pages are cookie-only — a key is not a sign-in.
 *
 * The role-rank comparison (meetsRole) and isWorkspaceRole live in ./types —
 * they're pure and unit-tested there, free of this module's `server-only`.
 */

/** Page-level guard: redirect to /sign-in if no session/membership. */
export async function requirePageMember(
  required: WorkspaceRole = "viewer",
): Promise<CurrentMember> {
  const member = await getCurrentMember(await nextHeaders());
  if (!member) {
    redirect("/sign-in");
  }
  if (!meetsRole(member.role, required)) {
    // Signed-in but lacking the role — bounce to boards which will render
    // a "no access" empty state rather than show a 500.
    redirect("/boards");
  }
  return member;
}

/**
 * Route-handler guard: returns either the member or a 401/403 NextResponse.
 *
 * Usage:
 *   const member = await requireApiMember("editor");
 *   if (member instanceof NextResponse) return member;
 *   // ... member.user.id, member.role, etc.
 */
export async function requireApiMember(
  required: WorkspaceRole = "viewer",
): Promise<ReleaseApiMember | NextResponse> {
  const headers = await nextHeaders();

  // A request carrying one of our keys authenticates by the key alone — no
  // falling back to cookies, so a revoked key fails loudly instead of
  // silently riding a browser session.
  const key = bearerApiKey(headers.get("authorization"));
  if (key) {
    const principal = await findMemberByApiKeyHash(hashApiKey(key));
    if (!principal) {
      return NextResponse.json(
        { error: "Invalid, expired, or revoked API key" },
        { status: 401 },
      );
    }
    const member: CurrentMember = {
      user: principal.user,
      workspaceId: principal.workspaceId,
      // The key's stored role is a ceiling, not a grant: cap it by the
      // member's current role so demotions apply to existing keys.
      role: minRole(principal.keyRole, principal.memberRole),
    };
    if (!meetsRole(member.role, required)) {
      return NextResponse.json(
        { error: `Requires ${required} role` },
        { status: 403 },
      );
    }
    return {
      ...member,
      credentialKind: "api_key",
      credentialId: principal.apiKeyId,
    };
  }

  const member = await getCurrentMember(headers);
  if (!member) {
    return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
  }
  if (!meetsRole(member.role, required)) {
    return NextResponse.json(
      { error: `Requires ${required} role` },
      { status: 403 },
    );
  }
  return { ...member, credentialKind: "session", credentialId: null };
}
