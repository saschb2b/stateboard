/**
 * Password-redaction helpers for logging a (possibly malformed) DATABASE_URL.
 *
 * Split out from migrate.mjs so the logic is unit-testable without running the
 * migration runner's side effects. These are the bits that decide what ends up
 * in operator logs when a connection string fails to parse, so a regression
 * here either leaks a password or prints something useless — exactly the kind
 * of thing to pin down with tests.
 */

/**
 * Mask a secret for a log line: reveal a few characters at each end so an
 * operator can recognize *which* value was used (and often its character
 * class — a trailing "=" or uppercase means base64, lowercase hex means the
 * URL-safe one) while keeping the bulk hidden. Short secrets reveal nothing,
 * since a few characters would expose most of them.
 */
export function maskSecret(s) {
  if (s.length <= 8) return "***";
  const reveal = s.length <= 16 ? 2 : 3;
  return `${s.slice(0, reveal)}***${s.slice(-reveal)}`;
}

/**
 * Render a connection string for logging with the password abbreviated. The
 * URL is malformed (that's why we're here), so this works on the raw string,
 * not the URL parser: it keeps the scheme, username, host, port, and database
 * — the parts useful for debugging — and runs only the password (between the
 * userinfo ":" and the "@") through maskSecret().
 */
export function redactDbUrl(raw) {
  if (typeof raw !== "string" || raw === "") return "(empty)";
  const schemeEnd = raw.indexOf("://");
  const at = raw.lastIndexOf("@");
  if (schemeEnd === -1 || at <= schemeEnd) return raw; // no "user:pass@" to hide
  const userinfo = raw.slice(schemeEnd + 3, at);
  const colon = userinfo.indexOf(":");
  if (colon === -1) return raw; // userinfo carries no password
  const head = raw.slice(0, schemeEnd + 3);
  const user = userinfo.slice(0, colon);
  const password = userinfo.slice(colon + 1);
  return `${head}${user}:${maskSecret(password)}${raw.slice(at)}`;
}
