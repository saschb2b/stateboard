/**
 * Upload filename allowlist — the path-traversal guard for the public
 * `/api/uploads/[filename]` route.
 *
 * Uploaded screens are stored as `${nanoid(12)}.${ext}` (see the screens POST
 * handler), so a legitimate name is a short id from nanoid's URL-safe alphabet
 * (`A-Za-z0-9_-`) plus an allowlisted image extension — nothing else. Anything
 * with a `/`, `\`, `.`, or `..` segment fails this test, so a crafted request
 * can't escape UPLOADS_DIR. The serve route also resolves the path and
 * re-checks it stays inside UPLOADS_DIR (defense in depth).
 *
 * Pure and dependency-free so the guard can be unit-tested directly — CLAUDE.md
 * flags this regex as load-bearing ("preserve that regex when touching the
 * route"), which is exactly the kind of thing to pin with tests.
 */
const UPLOAD_FILENAME_RE = /^[A-Za-z0-9_-]{6,32}\.(png|jpe?g|webp|gif)$/;

export function isAllowedUploadFilename(filename: string): boolean {
  return UPLOAD_FILENAME_RE.test(filename);
}
