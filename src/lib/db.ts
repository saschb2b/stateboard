import "server-only";
import Database from "better-sqlite3";
import { DB_FILE, ensureDataDirs } from "./paths";
import type {
  Board,
  Region,
  RegionState,
  Screen,
  ScreenWithRegions,
} from "./types";

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  ensureDataDirs();
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applyMigrations(db);
  _db = db;
  return db;
}

function applyMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT,
      is_demo     INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS screens (
      id         TEXT PRIMARY KEY,
      board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      filename   TEXT NOT NULL,
      mime_type  TEXT NOT NULL,
      width      INTEGER NOT NULL,
      height     INTEGER NOT NULL,
      label      TEXT,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_screens_board ON screens(board_id, position);

    CREATE TABLE IF NOT EXISTS regions (
      id         TEXT PRIMARY KEY,
      screen_id  TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
      x          REAL NOT NULL,
      y          REAL NOT NULL,
      w          REAL NOT NULL,
      h          REAL NOT NULL,
      state      TEXT NOT NULL,
      label      TEXT,
      notes      TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_regions_screen ON regions(screen_id);
  `);

  // Cleanup: an earlier iteration seeded a demo board into the DB. The demo
  // is now served from memory at /share/demo, so any leftover row is just noise
  // in the user's boards grid. Drop it (cascades to screens + regions).
  // Idempotent: no-op once is_demo column doesn't exist or no rows match.
  const cols = db
    .prepare<[], { name: string }>(`PRAGMA table_info(boards)`)
    .all();
  if (cols.some((c) => c.name === "is_demo")) {
    db.exec(`DELETE FROM boards WHERE is_demo = 1`);
  }
}

interface BoardRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

interface ScreenRow {
  id: string;
  board_id: string;
  filename: string;
  mime_type: string;
  width: number;
  height: number;
  label: string | null;
  position: number;
  created_at: number;
}

interface RegionRow {
  id: string;
  screen_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  state: string;
  label: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

function mapBoard(row: BoardRow): Board {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapScreen(row: ScreenRow): Screen {
  return {
    id: row.id,
    boardId: row.board_id,
    filename: row.filename,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    label: row.label,
    position: row.position,
    createdAt: row.created_at,
    mediaUrl: `/api/uploads/${row.filename}`,
  };
}

function mapRegion(row: RegionRow): Region {
  return {
    id: row.id,
    screenId: row.screen_id,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    state: row.state as RegionState,
    label: row.label,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----- boards ---------------------------------------------------------------

export function listBoards(): Board[] {
  return getDb()
    .prepare<[], BoardRow>(`SELECT * FROM boards ORDER BY updated_at DESC`)
    .all()
    .map(mapBoard);
}

export function getBoard(id: string): Board | null {
  const row = getDb()
    .prepare<[string], BoardRow>(`SELECT * FROM boards WHERE id = ?`)
    .get(id);
  return row ? mapBoard(row) : null;
}

export function getBoardBySlug(slug: string): Board | null {
  const row = getDb()
    .prepare<[string], BoardRow>(`SELECT * FROM boards WHERE slug = ?`)
    .get(slug);
  return row ? mapBoard(row) : null;
}

export function createBoard(input: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}): Board {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO boards (id, slug, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.id, input.slug, input.name, input.description, now, now);
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBoard(
  id: string,
  patch: { name?: string; description?: string | null },
): Board | null {
  const existing = getBoard(id);
  if (!existing) return null;
  const now = Date.now();
  const name = patch.name ?? existing.name;
  const description =
    patch.description === undefined ? existing.description : patch.description;
  getDb()
    .prepare(
      `UPDATE boards SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
    )
    .run(name, description, now, id);
  return { ...existing, name, description, updatedAt: now };
}

export function deleteBoard(id: string): boolean {
  const result = getDb().prepare(`DELETE FROM boards WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function touchBoard(id: string): void {
  getDb()
    .prepare(`UPDATE boards SET updated_at = ? WHERE id = ?`)
    .run(Date.now(), id);
}

// ----- screens --------------------------------------------------------------

export function listScreens(boardId: string): Screen[] {
  return getDb()
    .prepare<
      [string],
      ScreenRow
    >(`SELECT * FROM screens WHERE board_id = ? ORDER BY position ASC, created_at ASC`)
    .all(boardId)
    .map(mapScreen);
}

export function getScreen(id: string): Screen | null {
  const row = getDb()
    .prepare<[string], ScreenRow>(`SELECT * FROM screens WHERE id = ?`)
    .get(id);
  return row ? mapScreen(row) : null;
}

export function createScreen(input: {
  id: string;
  boardId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  label: string | null;
}): Screen {
  const now = Date.now();
  const db = getDb();
  const next =
    (db
      .prepare<
        [string],
        { max: number | null }
      >(`SELECT MAX(position) AS max FROM screens WHERE board_id = ?`)
      .get(input.boardId)?.max ?? -1) + 1;
  db.prepare(
    `INSERT INTO screens (id, board_id, filename, mime_type, width, height, label, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.boardId,
    input.filename,
    input.mimeType,
    input.width,
    input.height,
    input.label,
    next,
    now,
  );
  touchBoard(input.boardId);
  return {
    id: input.id,
    boardId: input.boardId,
    filename: input.filename,
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    label: input.label,
    position: next,
    createdAt: now,
    mediaUrl: `/api/uploads/${input.filename}`,
  };
}

export function updateScreen(
  id: string,
  patch: { label?: string | null },
): Screen | null {
  const existing = getScreen(id);
  if (!existing) return null;
  const label = patch.label === undefined ? existing.label : patch.label;
  getDb().prepare(`UPDATE screens SET label = ? WHERE id = ?`).run(label, id);
  touchBoard(existing.boardId);
  return { ...existing, label };
}

export function deleteScreen(id: string): boolean {
  const existing = getScreen(id);
  if (!existing) return false;
  const result = getDb().prepare(`DELETE FROM screens WHERE id = ?`).run(id);
  if (result.changes > 0) touchBoard(existing.boardId);
  return result.changes > 0;
}

// ----- regions --------------------------------------------------------------

export function listRegions(screenId: string): Region[] {
  return getDb()
    .prepare<
      [string],
      RegionRow
    >(`SELECT * FROM regions WHERE screen_id = ? ORDER BY created_at ASC`)
    .all(screenId)
    .map(mapRegion);
}

export function getRegion(id: string): Region | null {
  const row = getDb()
    .prepare<[string], RegionRow>(`SELECT * FROM regions WHERE id = ?`)
    .get(id);
  return row ? mapRegion(row) : null;
}

export function createRegion(input: {
  id: string;
  screenId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  state: RegionState;
  label: string | null;
  notes: string | null;
}): Region {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO regions (id, screen_id, x, y, w, h, state, label, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.screenId,
      input.x,
      input.y,
      input.w,
      input.h,
      input.state,
      input.label,
      input.notes,
      now,
      now,
    );
  const screen = getScreen(input.screenId);
  if (screen) touchBoard(screen.boardId);
  return {
    id: input.id,
    screenId: input.screenId,
    x: input.x,
    y: input.y,
    w: input.w,
    h: input.h,
    state: input.state,
    label: input.label,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateRegion(
  id: string,
  patch: Partial<
    Pick<Region, "x" | "y" | "w" | "h" | "state" | "label" | "notes">
  >,
): Region | null {
  const existing = getRegion(id);
  if (!existing) return null;
  const merged: Region = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  getDb()
    .prepare(
      `UPDATE regions SET x = ?, y = ?, w = ?, h = ?, state = ?, label = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      merged.x,
      merged.y,
      merged.w,
      merged.h,
      merged.state,
      merged.label,
      merged.notes,
      merged.updatedAt,
      id,
    );
  const screen = getScreen(existing.screenId);
  if (screen) touchBoard(screen.boardId);
  return merged;
}

export function deleteRegion(id: string): boolean {
  const existing = getRegion(id);
  if (!existing) return false;
  const result = getDb().prepare(`DELETE FROM regions WHERE id = ?`).run(id);
  if (result.changes > 0) {
    const screen = getScreen(existing.screenId);
    if (screen) touchBoard(screen.boardId);
  }
  return result.changes > 0;
}

// ----- composite ------------------------------------------------------------

export function getBoardWithScreens(boardId: string): {
  board: Board;
  screens: ScreenWithRegions[];
} | null {
  const board = getBoard(boardId);
  if (!board) return null;
  const screens = listScreens(boardId).map((s) => ({
    ...s,
    regions: listRegions(s.id),
  }));
  return { board, screens };
}
