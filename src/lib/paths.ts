import path from "node:path";
import fs from "node:fs";

/**
 * Resolves the on-disk locations StateBoard writes to.
 *
 * Defaults to ./data under the repo root, overridable via STATEBOARD_DATA_DIR.
 * Two subdirs: db/ for the SQLite file, uploads/ for screenshots.
 */
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data");

export const DATA_DIR = process.env.STATEBOARD_DATA_DIR
  ? path.resolve(process.env.STATEBOARD_DATA_DIR)
  : DEFAULT_DATA_DIR;

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_DIR = path.join(DATA_DIR, "db");
export const DB_FILE = path.join(DB_DIR, "stateboard.db");

let initialized = false;

export function ensureDataDirs(): void {
  if (initialized) return;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(DB_DIR, { recursive: true });
  initialized = true;
}
