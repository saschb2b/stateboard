import "server-only";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { bearerApiKey, hashApiKey } from "./api-keys";
import { getCurrentMember, type CurrentMember } from "./auth";
import { findMemberByApiKeyHash } from "./db";
import { meetsRole, minRole, type WorkspaceRole } from "./types";

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
): Promise<CurrentMember | NextResponse> {
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
    return member;
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
  return member;
}
