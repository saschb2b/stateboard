import "server-only";
import { Pool, type QueryResultRow } from "pg";
import type {
  Board,
  Region,
  RegionState,
  Screen,
  ScreenWithRegions,
  ShareLink,
  WorkspaceMember,
} from "./types";

/**
 * Single Postgres pool for the app process.
 *
 * Better Auth gets the same pool (see lib/auth.ts) — sharing one pool
 * across the auth + app code keeps connection counts predictable and
 * lets a future audit query JOIN across both halves of the schema.
 *
 * We do not auto-run migrations from here. The migration runner is a
 * separate, explicit step:
 *   - dev: `pnpm migrate`
 *   - prod: a Helm pre-install/upgrade Job, or the Dockerfile's entrypoint
 * Doing it in-process would make hot reload and concurrent boots racy.
 */
let _pool: Pool | null = null;

/**
 * Lazy Pool getter.
 *
 * Constructing the Pool does NOT open any connections — that happens on
 * first query. We deliberately don't throw when DATABASE_URL is missing
 * at construction time so that `next build` (which loads route modules
 * to collect metadata) doesn't fail in environments where the variable
 * is provided only at runtime. The first actual query will surface a
 * meaningful error if the URL is bogus or the server is unreachable.
 */
export function getPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL ?? process.env.STATEBOARD_DB_URL ?? "";
  _pool = new Pool({
    connectionString: url || undefined,
    max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
  });
  return _pool;
}

async function query<R extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<R[]> {
  const result = await getPool().query<R>(sql, params);
  return result.rows;
}

async function queryOne<R extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<R | null> {
  const rows = await query<R>(sql, params);
  return rows[0] ?? null;
}

/**
 * Default singleton workspace.
 *
 * v1 deploys one StateBoard instance per project (single-tenant) — the
 * "workspace" abstraction exists in the schema so v2 can grow a multi-
 * workspace UI without a data migration, but for now there's exactly one
 * row, with a fixed id.
 *
 * The first user to sign in becomes its owner (see auth-helpers.ts).
 */
export const DEFAULT_WORKSPACE_ID = "default";

export async function ensureDefaultWorkspace(
  name = "StateBoard",
): Promise<void> {
  await query(
    `INSERT INTO workspaces (id, name, created_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_WORKSPACE_ID, name, Date.now()],
  );
}

// ----- row → domain mapping -------------------------------------------------

interface BoardRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
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
  created_at: string;
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
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface ShareLinkRow {
  token: string;
  board_id: string;
  label: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface WorkspaceMemberRow {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

// pg returns BIGINT as a string to avoid JS precision loss. Convert to number;
// our timestamps are millis since epoch, well within Number.MAX_SAFE_INTEGER
// for the next ~285,000 years.
const num = (s: string | number): number =>
  typeof s === "number" ? s : Number(s);

function mapBoard(row: BoardRow): Board {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
    updatedBy: row.updated_by,
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
    createdAt: num(row.created_at),
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
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
    updatedBy: row.updated_by,
  };
}

function mapShareLink(row: ShareLinkRow): ShareLink {
  return {
    token: row.token,
    boardId: row.board_id,
    label: row.label,
    createdBy: row.created_by,
    createdAt: num(row.created_at),
    revokedAt: row.revoked_at === null ? null : num(row.revoked_at),
  };
}

function mapMember(row: WorkspaceMemberRow): WorkspaceMember {
  return {
    userId: row.user_id,
    role: row.role,
    createdAt: num(row.created_at),
    name: row.name,
    email: row.email,
    image: row.image,
  };
}

// ----- audit log ------------------------------------------------------------

export type AuditAction =
  | "board.create"
  | "board.update"
  | "board.delete"
  | "screen.create"
  | "screen.update"
  | "screen.delete"
  | "region.create"
  | "region.update"
  | "region.delete"
  | "share_link.create"
  | "share_link.revoke"
  | "member.add"
  | "member.remove"
  | "member.role_change";

export async function writeAudit(input: {
  workspaceId: string;
  actorId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_log (workspace_id, actor_id, action, target_type, target_id, meta, at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.workspaceId,
      input.actorId,
      input.action,
      input.targetType,
      input.targetId,
      input.meta ? JSON.stringify(input.meta) : null,
      Date.now(),
    ],
  );
}

// ----- workspace + membership ----------------------------------------------

export async function listMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const rows = await query<WorkspaceMemberRow>(
    `SELECT m.user_id, m.role, m.created_at, u.name, u.email, u.image
       FROM workspace_members m
       JOIN "user" u ON u.id = m.user_id
      WHERE m.workspace_id = $1
      ORDER BY m.created_at ASC`,
    [workspaceId],
  );
  return rows.map(mapMember);
}

export async function getMembership(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMember | null> {
  const row = await queryOne<WorkspaceMemberRow>(
    `SELECT m.user_id, m.role, m.created_at, u.name, u.email, u.image
       FROM workspace_members m
       JOIN "user" u ON u.id = m.user_id
      WHERE m.workspace_id = $1 AND m.user_id = $2`,
    [workspaceId, userId],
  );
  return row ? mapMember(row) : null;
}

export async function countMembers(workspaceId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::TEXT AS count FROM workspace_members WHERE workspace_id = $1`,
    [workspaceId],
  );
  return row ? Number(row.count) : 0;
}

export async function countOwners(workspaceId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::TEXT AS count FROM workspace_members
      WHERE workspace_id = $1 AND role = 'owner'`,
    [workspaceId],
  );
  return row ? Number(row.count) : 0;
}

export async function addMember(input: {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
}): Promise<void> {
  await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [input.workspaceId, input.userId, input.role, Date.now()],
  );
}

export async function updateMemberRole(input: {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
}): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2`,
    [input.workspaceId, input.userId, input.role],
  );
  return result.rowCount! > 0;
}

export async function removeMember(input: {
  workspaceId: string;
  userId: string;
}): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [input.workspaceId, input.userId],
  );
  return result.rowCount! > 0;
}

// ----- boards ---------------------------------------------------------------

export async function listBoards(workspaceId: string): Promise<Board[]> {
  const rows = await query<BoardRow>(
    `SELECT * FROM boards WHERE workspace_id = $1 ORDER BY updated_at DESC`,
    [workspaceId],
  );
  return rows.map(mapBoard);
}

export async function getBoard(id: string): Promise<Board | null> {
  const row = await queryOne<BoardRow>(`SELECT * FROM boards WHERE id = $1`, [
    id,
  ]);
  return row ? mapBoard(row) : null;
}

export async function createBoard(input: {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string;
}): Promise<Board> {
  const now = Date.now();
  const row = await queryOne<BoardRow>(
    `INSERT INTO boards (id, workspace_id, name, description, created_by, created_at, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $5)
     RETURNING *`,
    [
      input.id,
      input.workspaceId,
      input.name,
      input.description,
      input.createdBy,
      now,
    ],
  );
  return mapBoard(row!);
}

export async function updateBoard(
  id: string,
  patch: { name?: string; description?: string | null },
  actorId: string,
): Promise<Board | null> {
  const existing = await getBoard(id);
  if (!existing) return null;
  const now = Date.now();
  const name = patch.name ?? existing.name;
  const description =
    patch.description === undefined ? existing.description : patch.description;
  const row = await queryOne<BoardRow>(
    `UPDATE boards
       SET name = $2, description = $3, updated_at = $4, updated_by = $5
     WHERE id = $1
     RETURNING *`,
    [id, name, description, now, actorId],
  );
  return row ? mapBoard(row) : null;
}

export async function deleteBoard(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM boards WHERE id = $1`, [
    id,
  ]);
  return result.rowCount! > 0;
}

async function touchBoard(id: string, actorId: string): Promise<void> {
  await query(
    `UPDATE boards SET updated_at = $1, updated_by = $2 WHERE id = $3`,
    [Date.now(), actorId, id],
  );
}

// ----- screens --------------------------------------------------------------

export async function listScreens(boardId: string): Promise<Screen[]> {
  const rows = await query<ScreenRow>(
    `SELECT * FROM screens WHERE board_id = $1 ORDER BY position ASC, created_at ASC`,
    [boardId],
  );
  return rows.map(mapScreen);
}

export async function getScreen(id: string): Promise<Screen | null> {
  const row = await queryOne<ScreenRow>(`SELECT * FROM screens WHERE id = $1`, [
    id,
  ]);
  return row ? mapScreen(row) : null;
}

export async function createScreen(
  input: {
    id: string;
    boardId: string;
    filename: string;
    mimeType: string;
    width: number;
    height: number;
    label: string | null;
  },
  actorId: string,
): Promise<Screen> {
  const now = Date.now();
  const maxRow = await queryOne<{ max: number | null }>(
    `SELECT MAX(position) AS max FROM screens WHERE board_id = $1`,
    [input.boardId],
  );
  const next = (maxRow?.max ?? -1) + 1;
  const row = await queryOne<ScreenRow>(
    `INSERT INTO screens (id, board_id, filename, mime_type, width, height, label, position, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.id,
      input.boardId,
      input.filename,
      input.mimeType,
      input.width,
      input.height,
      input.label,
      next,
      now,
    ],
  );
  await touchBoard(input.boardId, actorId);
  return mapScreen(row!);
}

export async function updateScreen(
  id: string,
  patch: { label?: string | null },
  actorId: string,
): Promise<Screen | null> {
  const existing = await getScreen(id);
  if (!existing) return null;
  const label = patch.label === undefined ? existing.label : patch.label;
  await query(`UPDATE screens SET label = $1 WHERE id = $2`, [label, id]);
  await touchBoard(existing.boardId, actorId);
  return { ...existing, label };
}

export async function deleteScreen(
  id: string,
  actorId: string,
): Promise<boolean> {
  const existing = await getScreen(id);
  if (!existing) return false;
  const result = await getPool().query(`DELETE FROM screens WHERE id = $1`, [
    id,
  ]);
  if (result.rowCount! > 0) await touchBoard(existing.boardId, actorId);
  return result.rowCount! > 0;
}

// ----- regions --------------------------------------------------------------

export async function listRegions(screenId: string): Promise<Region[]> {
  const rows = await query<RegionRow>(
    `SELECT * FROM regions WHERE screen_id = $1 ORDER BY created_at ASC`,
    [screenId],
  );
  return rows.map(mapRegion);
}

export async function getRegion(id: string): Promise<Region | null> {
  const row = await queryOne<RegionRow>(`SELECT * FROM regions WHERE id = $1`, [
    id,
  ]);
  return row ? mapRegion(row) : null;
}

export async function createRegion(
  input: {
    id: string;
    screenId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    state: RegionState;
    label: string | null;
    notes: string | null;
  },
  actorId: string,
): Promise<Region> {
  const now = Date.now();
  const row = await queryOne<RegionRow>(
    `INSERT INTO regions (id, screen_id, x, y, w, h, state, label, notes, created_at, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11)
     RETURNING *`,
    [
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
      actorId,
    ],
  );
  const screen = await getScreen(input.screenId);
  if (screen) await touchBoard(screen.boardId, actorId);
  return mapRegion(row!);
}

export async function updateRegion(
  id: string,
  patch: Partial<
    Pick<Region, "x" | "y" | "w" | "h" | "state" | "label" | "notes">
  >,
  actorId: string,
): Promise<Region | null> {
  const existing = await getRegion(id);
  if (!existing) return null;
  const merged = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
    updatedBy: actorId,
  };
  const row = await queryOne<RegionRow>(
    `UPDATE regions
       SET x = $2, y = $3, w = $4, h = $5, state = $6, label = $7, notes = $8,
           updated_at = $9, updated_by = $10
     WHERE id = $1
     RETURNING *`,
    [
      id,
      merged.x,
      merged.y,
      merged.w,
      merged.h,
      merged.state,
      merged.label,
      merged.notes,
      merged.updatedAt,
      merged.updatedBy,
    ],
  );
  const screen = await getScreen(existing.screenId);
  if (screen) await touchBoard(screen.boardId, actorId);
  return row ? mapRegion(row) : null;
}

export async function deleteRegion(
  id: string,
  actorId: string,
): Promise<boolean> {
  const existing = await getRegion(id);
  if (!existing) return false;
  const result = await getPool().query(`DELETE FROM regions WHERE id = $1`, [
    id,
  ]);
  if (result.rowCount! > 0) {
    const screen = await getScreen(existing.screenId);
    if (screen) await touchBoard(screen.boardId, actorId);
  }
  return result.rowCount! > 0;
}

// ----- composite ------------------------------------------------------------

export async function getBoardWithScreens(
  boardId: string,
): Promise<{ board: Board; screens: ScreenWithRegions[] } | null> {
  const board = await getBoard(boardId);
  if (!board) return null;
  const screens = await listScreens(boardId);
  // One round-trip per screen is fine for v1 — boards typically hold
  // <20 screens. Replace with a single JOIN if it ever shows up in
  // a profile.
  const withRegions: ScreenWithRegions[] = await Promise.all(
    screens.map(async (s) => ({ ...s, regions: await listRegions(s.id) })),
  );
  return { board, screens: withRegions };
}

// ----- share links ----------------------------------------------------------

export async function listShareLinks(boardId: string): Promise<ShareLink[]> {
  const rows = await query<ShareLinkRow>(
    `SELECT * FROM share_links WHERE board_id = $1 ORDER BY created_at DESC`,
    [boardId],
  );
  return rows.map(mapShareLink);
}

export async function getShareLink(token: string): Promise<ShareLink | null> {
  const row = await queryOne<ShareLinkRow>(
    `SELECT * FROM share_links WHERE token = $1`,
    [token],
  );
  return row ? mapShareLink(row) : null;
}

export async function createShareLink(input: {
  token: string;
  boardId: string;
  label: string | null;
  createdBy: string;
}): Promise<ShareLink> {
  const row = await queryOne<ShareLinkRow>(
    `INSERT INTO share_links (token, board_id, label, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.token, input.boardId, input.label, input.createdBy, Date.now()],
  );
  return mapShareLink(row!);
}

export async function revokeShareLink(token: string): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE share_links SET revoked_at = $1 WHERE token = $2 AND revoked_at IS NULL`,
    [Date.now(), token],
  );
  return result.rowCount! > 0;
}
