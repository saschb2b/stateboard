import { createHash, randomBytes } from "node:crypto";

/**
 * API-key format and hashing. Pure (no `server-only`) so it can be
 * unit-tested; the DB lookup and the route handlers live elsewhere.
 *
 * A key looks like `sbk_<43 base64url chars>` — 256 bits of entropy from
 * `crypto.randomBytes`. Only the sha256 hex of the full key is stored;
 * lookup is by unique hash index, so the plaintext never touches the DB
 * and a dumped table contains nothing replayable.
 */

export const API_KEY_PREFIX = "sbk_";

/** `sbk_` + 43 chars of base64url(32 random bytes). */
const API_KEY_RE = /^sbk_[A-Za-z0-9_-]{43}$/;

/** How much of the key the UI may keep for display: "sbk_a1b2c3d4". */
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;

export interface GeneratedApiKey {
  /** The full secret — shown to the creator once, never stored. */
  key: string;
  /** sha256 hex of `key`; the only thing persisted. */
  keyHash: string;
  /** Truncated form for the key list ("sbk_a1b2c3d4"). */
  keyPrefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Is this string shaped like one of our keys? (Not a validity check.) */
export function isApiKeyFormat(value: unknown): value is string {
  return typeof value === "string" && API_KEY_RE.test(value);
}

const DAY_MS = 86_400_000;

/**
 * Creation-time expiry presets, in days. 90 is the default (GitHub's
 * fine-grained-token posture: keys should rot unless someone decides
 * otherwise); "no expiration" is an explicit choice, never the default.
 */
export const API_KEY_EXPIRY_PRESETS = [30, 60, 90, 365] as const;
export const DEFAULT_API_KEY_EXPIRY_DAYS = 90;
export const MAX_API_KEY_EXPIRY_DAYS = 3650;

export type ExpiryParse =
  | { ok: true; expiresAt: number | null }
  | { ok: false; error: string };

/**
 * Turn a request's `expiresInDays` field into an absolute expiry.
 * Absent → the 90-day default. Explicit `null` → never expires.
 * Anything else must be a whole number of days in [1, 3650].
 */
export function parseExpiresInDays(value: unknown, now: number): ExpiryParse {
  if (value === undefined) {
    return { ok: true, expiresAt: now + DEFAULT_API_KEY_EXPIRY_DAYS * DAY_MS };
  }
  if (value === null) return { ok: true, expiresAt: null };
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_API_KEY_EXPIRY_DAYS
  ) {
    return {
      ok: false,
      error: `expiresInDays must be a whole number of days between 1 and ${MAX_API_KEY_EXPIRY_DAYS}, or null for no expiration`,
    };
  }
  return { ok: true, expiresAt: now + value * DAY_MS };
}

export type ApiKeyExpiryStatus = "active" | "expiring-soon" | "expired";

/** UI-facing expiry status; "expiring-soon" inside a 14-day warning window. */
export function apiKeyExpiryStatus(
  expiresAt: number | null,
  now: number,
  soonWindowMs = 14 * DAY_MS,
): ApiKeyExpiryStatus {
  if (expiresAt === null) return "active";
  if (expiresAt <= now) return "expired";
  return expiresAt - now <= soonWindowMs ? "expiring-soon" : "active";
}

/**
 * Extract a well-formed API key from an Authorization header, or null.
 * The scheme is matched case-insensitively per RFC 9110; anything that
 * isn't `Bearer sbk_…` (e.g. a Bearer JWT meant for someone else) returns
 * null so callers can fall through to session auth untouched.
 */
export function bearerApiKey(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1]?.trim() ?? "";
  return isApiKeyFormat(token) ? token : null;
}
