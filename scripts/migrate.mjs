#!/usr/bin/env node
/**
 * Hand-rolled SQL migration runner.
 *
 * - Reads migrations/*.sql in lexicographic order.
 * - Wraps each file in a transaction.
 * - Tracks applied filenames in `schema_migrations`.
 * - Idempotent: re-running is a no-op once everything is applied.
 *
 * No ORM, no migration framework. The contents of every migration are
 * plain SQL anyone reviewing the repo can read end-to-end.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm migrate
 *
 * Loaded automatically on app startup (lib/db.ts) and also runs as the
 * migrate Job in the Helm chart pre-install/upgrade hook.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const migrationsDir = path.join(repoRoot, "migrations");

const databaseUrl = process.env.DATABASE_URL ?? process.env.STATEBOARD_DB_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL (or STATEBOARD_DB_URL) is required to run migrations.",
  );
  process.exit(1);
}

/**
 * Mask a secret for a log line: reveal a few characters at each end so an
 * operator can recognize *which* value was used (and often its character
 * class — a trailing "=" or uppercase means base64, lowercase hex means the
 * URL-safe one) while keeping the bulk hidden. Short secrets reveal nothing,
 * since a few characters would expose most of them.
 */
function maskSecret(s) {
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
function redactDbUrl(raw) {
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

let client;
try {
  client = new pg.Client({ connectionString: databaseUrl });
} catch (err) {
  // pg redacts the connection string in this error, so the raw message
  // ("Invalid URL", base: postgres://base) is impossible to act on. The
  // usual cause is a DB password with URL-reserved characters — notably the
  // "/" that `openssl rand -base64` often produces — embedded unencoded.
  if (err && err.code === "ERR_INVALID_URL") {
    console.error(
      "DATABASE_URL is not a valid postgres connection string.\n" +
        `  value (password abbreviated): ${redactDbUrl(databaseUrl)}\n` +
        "If the password contains URL-reserved characters (notably `/`, " +
        "which `openssl rand -base64` frequently includes), percent-encode " +
        "them in the URL — or use a URL-safe password, e.g. `openssl rand -hex 32`.",
    );
    process.exit(1);
  }
  throw err;
}
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  BIGINT NOT NULL
    );
  `);

  const applied = new Set(
    (await client.query("SELECT filename FROM schema_migrations")).rows.map(
      (r) => r.filename,
    ),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`apply  ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, $2)",
        [file, Date.now()],
      );
      await client.query("COMMIT");
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed ${file}:`, err);
      process.exit(1);
    }
  }

  console.log(`\ndone — applied ${ran} migration(s).`);
} finally {
  await client.end();
}
