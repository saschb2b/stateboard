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

const client = new pg.Client({ connectionString: databaseUrl });
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
