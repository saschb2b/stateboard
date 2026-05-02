import "server-only";
import { betterAuth } from "better-auth";
import { genericOAuth, keycloak } from "better-auth/plugins/generic-oauth";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import {
  addMember,
  countMembers,
  DEFAULT_WORKSPACE_ID,
  ensureDefaultWorkspace,
  getMembership,
  getPool,
  writeAudit,
} from "./db";

/**
 * Better Auth instance.
 *
 * Wires Keycloak as the OIDC provider and persists everything in the same
 * Postgres database the app uses. Only OIDC is enabled — there is no
 * email/password fallback. If Keycloak is unreachable, no one signs in;
 * that's intentional. v1 is the "deployable in companies" cut, and those
 * companies already run an SSO of record.
 *
 * The `databaseHooks` ensure that every newly-created user lands in the
 * default workspace with a sane role:
 *   - first user becomes the owner (so a fresh deployment has someone
 *     who can manage the others)
 *   - subsequent users become editors by default (configurable via
 *     STATEBOARD_DEFAULT_ROLE = owner | editor | viewer)
 *
 * Sign-up is gated by STATEBOARD_ALLOWED_EMAIL_DOMAINS (comma-separated
 * list, e.g. "acme.com,acme.de"). Empty/unset means "any signed-in
 * Keycloak user from the configured realm can join". For tighter
 * deployments, restrict at the Keycloak realm level too.
 */

const ALLOWED_EMAIL_DOMAINS = (
  process.env.STATEBOARD_ALLOWED_EMAIL_DOMAINS ?? ""
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function isEmailAllowed(email: string): boolean {
  if (ALLOWED_EMAIL_DOMAINS.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

const DEFAULT_NEW_USER_ROLE = (() => {
  const v = (process.env.STATEBOARD_DEFAULT_ROLE ?? "editor").toLowerCase();
  if (v === "owner" || v === "editor" || v === "viewer") return v;
  return "editor" as const;
})();

const issuer = process.env.KEYCLOAK_ISSUER;
const clientId = process.env.KEYCLOAK_CLIENT_ID;
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
const baseURL = process.env.STATEBOARD_BASE_URL ?? process.env.BETTER_AUTH_URL;

if (!issuer || !clientId || !clientSecret) {
  // We don't throw at import time — the docs build and certain CLI
  // commands (typecheck, lint) shouldn't require live auth credentials.
  // The first sign-in attempt will surface the missing env via the
  // Keycloak provider's own validation.
  console.warn(
    "[stateboard] KEYCLOAK_ISSUER / KEYCLOAK_CLIENT_ID / KEYCLOAK_CLIENT_SECRET not set; sign-in will fail until they are configured.",
  );
}

export const auth = betterAuth({
  database: getPool(),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.STATEBOARD_AUTH_SECRET,
  // Email/password disabled — OIDC-only.
  emailAndPassword: { enabled: false },
  user: {
    // We never delete users via the auth surface; deletion goes through
    // the workspace members UI which falls through to "remove membership"
    // rather than a destructive auth.api.deleteUser.
    deleteUser: { enabled: false },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isEmailAllowed(user.email)) {
            throw new APIError("FORBIDDEN", {
              message:
                "Your email domain isn't allowed on this StateBoard instance.",
            });
          }
          return { data: user };
        },
        after: async (user) => {
          await ensureDefaultWorkspace();
          const existing = await countMembers(DEFAULT_WORKSPACE_ID);
          const role = existing === 0 ? "owner" : DEFAULT_NEW_USER_ROLE;
          await addMember({
            workspaceId: DEFAULT_WORKSPACE_ID,
            userId: user.id,
            role,
          });
          await writeAudit({
            workspaceId: DEFAULT_WORKSPACE_ID,
            actorId: user.id,
            action: "member.add",
            targetType: "user",
            targetId: user.id,
            meta: { role, viaSignIn: true },
          });
        },
      },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: clientId ?? "",
          clientSecret: clientSecret ?? "",
          issuer: issuer ?? "",
        }),
      ],
    }),
    // Keep this last — it sets cookies on Next.js server actions properly.
    nextCookies(),
  ],
});

/**
 * Re-exported as a convenience so route handlers can do `auth.api.getSession`
 * without two imports. The shape Better Auth returns is:
 *   { user: { id, email, name, image, ... }, session: { ... } } | null
 */
export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/** Membership we expose to the rest of the app once a session is verified. */
export interface CurrentMember {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  workspaceId: string;
  role: "owner" | "editor" | "viewer";
}

/**
 * Resolve the currently-signed-in user's membership, or null.
 *
 * The `headers()` from Next must be passed in because this is called from
 * server components and route handlers.
 */
export async function getCurrentMember(
  headers: Headers,
): Promise<CurrentMember | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  const membership = await getMembership(DEFAULT_WORKSPACE_ID, session.user.id);
  if (!membership) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
    workspaceId: DEFAULT_WORKSPACE_ID,
    role: membership.role,
  };
}
