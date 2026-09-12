"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client.
 *
 * Used to trigger sign-in (`authClient.signIn.social({ provider: "keycloak" })`;
 * Better Auth 1.7 serves generic OAuth providers through the core social
 * endpoints, so no client plugin is needed)
 * and to read the current session in client components via `useSession()`.
 * Server code should import from `lib/auth.ts` instead.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;
