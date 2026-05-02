"use client";

import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

/**
 * Browser-side Better Auth client.
 *
 * Used to trigger sign-in (`authClient.signIn.oauth2({ providerId: "keycloak" })`)
 * and to read the current session in client components via `useSession()`.
 * Server code should import from `lib/auth.ts` instead.
 */
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

export const { useSession, signIn, signOut } = authClient;
