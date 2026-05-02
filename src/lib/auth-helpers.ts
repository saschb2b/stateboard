import "server-only";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentMember, type CurrentMember } from "./auth";
import { WORKSPACE_ROLES, type WorkspaceRole } from "./types";

/**
 * Helpers shared between server components and API routes.
 *
 * `requirePageMember` is for server components: redirects to /sign-in
 * when there's no session. `requireApiMember` is for route handlers:
 * returns a 401/403 NextResponse when access fails so the caller can
 * `if (member instanceof NextResponse) return member;`.
 */

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

function meetsRole(actual: WorkspaceRole, required: WorkspaceRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function isWorkspaceRole(v: unknown): v is WorkspaceRole {
  return (
    typeof v === "string" && (WORKSPACE_ROLES as readonly string[]).includes(v)
  );
}

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
  const member = await getCurrentMember(await nextHeaders());
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
