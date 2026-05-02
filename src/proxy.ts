import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate (Next.js 16 "proxy" convention).
 *
 * Cookie-only check for speed — actual auth enforcement happens in each
 * server component / route handler via `requirePageMember`/`requireApiMember`,
 * which validate the session against the database. The proxy exists
 * purely to bounce unauthenticated visitors out of the editor before the
 * page renders, and to keep API mutations from even reaching the handler
 * without a session cookie.
 *
 * Public surfaces (no cookie required):
 *   - /                      marketing
 *   - /docs/*                docs
 *   - /share/*               read-only board view (the artifact thesis)
 *   - /sign-in               Keycloak entry point
 *   - /api/auth/*            Better Auth's own routes
 *   - /api/uploads/*         screen images (referenced from /share/*)
 *   - /api/search            docs search index
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = getSessionCookie(request);
  if (sessionCookie) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/boards/:path*",
    "/settings/:path*",
    "/api/boards/:path*",
    "/api/screens/:path*",
    "/api/regions/:path*",
    "/api/share-links/:path*",
    "/api/workspace/:path*",
  ],
};
