import path from "node:path";
import fs from "node:fs";

/**
 * Resolves the on-disk locations StateBoard writes to.
 *
 * v1 keeps uploaded screenshots on the local filesystem (or a mounted
 * volume in k8s). Defaults to ./data under the repo root, overridable
 * via STATEBOARD_DATA_DIR.
 *
 * The SQLite db file lived here in v0 — gone now; v1 stores all
 * structured data in Postgres (see DATABASE_URL / lib/db.ts).
 */
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data");

export const DATA_DIR = process.env.STATEBOARD_DATA_DIR
  ? path.resolve(process.env.STATEBOARD_DATA_DIR)
  : DEFAULT_DATA_DIR;

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

let initialized = false;

export function ensureDataDirs(): void {
  if (initialized) return;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  initialized = true;
}
