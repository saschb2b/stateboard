import "server-only";
import { Pool, type QueryResultRow } from "pg";
import type {
  ApiKey,
  Board,
  Region,
  RegionState,
  Screen,
  ScreenWithRegions,
  ShareLink,
  UserRef,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceScreen,
} from "./types";
import type {
  AuditAction,
  AuditCursor,
  AuditEntry,
  AuditFilters,
} from "./audit";

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
 *   - prod: a Helm pre-install/upgrade Job, or the one-shot `migrate`
 *     service in deploy/docker-compose.yaml
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

interface ApiKeyRow {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  role: WorkspaceRole;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
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

// The hash column is deliberately absent: nothing outside the auth lookup
// should ever see it, and the lookup matches on it rather than returning it.
function mapApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    role: row.role,
    createdAt: num(row.created_at),
    lastUsedAt: row.last_used_at === null ? null : num(row.last_used_at),
    revokedAt: row.revoked_at === null ? null : num(row.revoked_at),
  };
}

// ----- audit log ------------------------------------------------------------

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  at: string;
}

function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: num(row.id),
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    meta: row.meta,
    at: num(row.at),
  };
}

export async function writeAudit(input: {
  workspaceId: string;
  actorId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  meta?: Record<string, unknown>;
  /**
   * The board this event belongs to, denormalized so a board-scoped history
   * survives deletion of the immediate target. Omit for workspace-level events
   * (member.*), which have no board.
   */
  boardId?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO audit_log (workspace_id, actor_id, action, target_type, target_id, meta, at, board_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.workspaceId,
      input.actorId,
      input.action,
      input.targetType,
      input.targetId,
      input.meta ? JSON.stringify(input.meta) : null,
      Date.now(),
      input.boardId ?? null,
    ],
  );
}

/**
 * The distinct users who appear as actors in a workspace's audit log, joined
 * to their identity for the "actor" filter dropdown. Includes members who have
 * since left (their `user` row survives), which is exactly who a compliance
 * reviewer wants to be able to filter by. Rows whose actor account was deleted
 * (actor_id NULL) are naturally excluded.
 */
export async function listAuditActors(
  workspaceId: string,
  boardId?: string,
): Promise<UserRef[]> {
  const params: unknown[] = [workspaceId];
  let scope = "";
  if (boardId) {
    params.push(boardId);
    scope = ` AND a.board_id = $${params.length}`;
  }
  const rows = await query<{ id: string; name: string | null; email: string }>(
    `SELECT DISTINCT u.id, u.name, u.email
       FROM audit_log a
       JOIN "user" u ON u.id = a.actor_id
      WHERE a.workspace_id = $1${scope}
      ORDER BY u.name`,
    params,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email }));
}

/**
 * A page of audit-log entries, newest first, with the applied filters.
 *
 * Uses keyset pagination on `(at DESC, id DESC)` rather than OFFSET: the log is
 * append-only and unbounded, and this rides the `(workspace_id, at DESC)` index
 * with stable pages even as new rows land. Pass the previous page's `nextCursor`
 * to fetch the next. The filter clauses are all parameterized; `limit` is
 * clamped so a caller can't ask for the whole table in one shot.
 */
export async function listAuditLog(
  workspaceId: string,
  filters: AuditFilters,
  opts: { cursor?: AuditCursor | null; limit: number },
): Promise<{ entries: AuditEntry[]; nextCursor: AuditCursor | null }> {
  const params: unknown[] = [workspaceId];
  const where: string[] = ["a.workspace_id = $1"];
  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.boardId) where.push(`a.board_id = ${bind(filters.boardId)}`);
  if (filters.actor) where.push(`a.actor_id = ${bind(filters.actor)}`);
  if (filters.action) where.push(`a.action = ${bind(filters.action)}`);
  if (filters.targetType) {
    where.push(`a.target_type = ${bind(filters.targetType)}`);
  }
  if (filters.fromMs !== undefined)
    where.push(`a.at >= ${bind(filters.fromMs)}`);
  if (filters.toMs !== undefined) where.push(`a.at < ${bind(filters.toMs)}`);
  if (opts.cursor) {
    const at = bind(opts.cursor.at);
    const id = bind(opts.cursor.id);
    where.push(`(a.at < ${at} OR (a.at = ${at} AND a.id < ${id}))`);
  }

  const limit = Math.max(1, Math.min(10_000, Math.trunc(opts.limit)));
  // Fetch one extra to detect a following page without a second count query.
  const rows = await query<AuditRow>(
    `SELECT a.id, a.actor_id, u.name AS actor_name, a.action,
            a.target_type, a.target_id, a.meta, a.at
       FROM audit_log a
       LEFT JOIN "user" u ON u.id = a.actor_id
      WHERE ${where.join(" AND ")}
      ORDER BY a.at DESC, a.id DESC
      LIMIT ${bind(limit + 1)}`,
    params,
  );

  const hasMore = rows.length > limit;
  const entries = (hasMore ? rows.slice(0, limit) : rows).map(mapAudit);
  const last = entries[entries.length - 1];
  const nextCursor = hasMore && last ? { at: last.at, id: last.id } : null;
  return { entries, nextCursor };
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

/**
 * Resolve a set of user ids to their display identity, for attribution lines
 * ("created by …", "last edited by …") in the editor.
 *
 * Joins the auth `user` table directly rather than `workspace_members`, so
 * someone who has since left the workspace still resolves to their name — their
 * `user` row survives (only `workspace_members` is deleted on removal). Ids with
 * no surviving user row (a deleted account) are simply absent from the result;
 * the caller renders those as "a former member". Nulls and duplicates are
 * dropped, and an empty request skips the query entirely.
 */
export async function getUserRefs(ids: (string | null)[]): Promise<UserRef[]> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];
  if (unique.length === 0) return [];
  const rows = await query<{ id: string; name: string | null; email: string }>(
    `SELECT id, name, email FROM "user" WHERE id = ANY($1)`,
    [unique],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email }));
}

// ----- boards ---------------------------------------------------------------

export async function listBoards(workspaceId: string): Promise<Board[]> {
  const rows = await query<BoardRow>(
    `SELECT * FROM boards WHERE workspace_id = $1 ORDER BY updated_at DESC`,
    [workspaceId],
  );
  return rows.map(mapBoard);
}

/**
 * Per-board region-state tallies for a whole workspace in one query.
 * Powers the MCP `list_boards` tool, where an agent wants the status
 * shape of everything without fetching each board. Boards with no
 * regions simply don't appear.
 */
export async function listBoardStateCounts(
  workspaceId: string,
): Promise<Map<string, Record<RegionState, number>>> {
  const rows = await query<{ board_id: string; state: RegionState; n: string }>(
    `SELECT s.board_id, r.state, COUNT(*) AS n
     FROM regions r
     JOIN screens s ON s.id = r.screen_id
     JOIN boards b ON b.id = s.board_id
     WHERE b.workspace_id = $1
     GROUP BY s.board_id, r.state`,
    [workspaceId],
  );
  const counts = new Map<string, Record<RegionState, number>>();
  for (const row of rows) {
    const entry = counts.get(row.board_id) ?? {
      shipped: 0,
      mock: 0,
      missing: 0,
    };
    entry[row.state] = num(row.n);
    counts.set(row.board_id, entry);
  }
  return counts;
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

/**
 * Every screen in the workspace, tagged with its board's name, for the
 * "reuse a screenshot" picker. Newest boards first, then screen order.
 */
export async function listWorkspaceScreens(
  workspaceId: string,
): Promise<WorkspaceScreen[]> {
  const rows = await query<ScreenRow & { board_name: string }>(
    `SELECT s.*, b.name AS board_name
       FROM screens s
       JOIN boards b ON b.id = s.board_id
      WHERE b.workspace_id = $1
      ORDER BY b.updated_at DESC, s.position ASC`,
    [workspaceId],
  );
  return rows.map((row) => ({ ...mapScreen(row), boardName: row.board_name }));
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

/**
 * Swap a screen's underlying image, keeping its id, label, position, and
 * regions. The normalized region coordinates stay valid against any new
 * image, so "replace the screenshot, keep the rectangles" needs only an
 * UPDATE. Re-reads the row so the returned `mediaUrl` points at the new file.
 */
export async function updateScreenImage(
  id: string,
  image: { filename: string; mimeType: string; width: number; height: number },
  actorId: string,
): Promise<Screen | null> {
  const existing = await getScreen(id);
  if (!existing) return null;
  await query(
    `UPDATE screens SET filename = $1, mime_type = $2, width = $3, height = $4 WHERE id = $5`,
    [image.filename, image.mimeType, image.width, image.height, id],
  );
  await touchBoard(existing.boardId, actorId);
  return getScreen(id);
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

/**
 * Set screen order for a board from a fully-specified id list. `orderedIds`
 * must be a permutation of exactly this board's screens (no missing, extra,
 * duplicate, or foreign ids), or null is returned and nothing is written.
 * Positions become the array indices in one atomic UPDATE.
 */
export async function reorderScreens(
  boardId: string,
  orderedIds: string[],
  actorId: string,
): Promise<Screen[] | null> {
  const current = await listScreens(boardId);
  const currentIds = new Set(current.map((s) => s.id));
  const unique = new Set(orderedIds);
  if (
    orderedIds.length !== current.length ||
    unique.size !== orderedIds.length ||
    !orderedIds.every((id) => currentIds.has(id))
  ) {
    return null;
  }
  await query(
    `UPDATE screens AS s
        SET position = data.pos
       FROM (SELECT * FROM unnest($2::text[], $3::int[]) AS t(id, pos)) AS data
      WHERE s.id = data.id AND s.board_id = $1`,
    [boardId, orderedIds, orderedIds.map((_, i) => i)],
  );
  await touchBoard(boardId, actorId);
  return listScreens(boardId);
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

// ----- api keys -------------------------------------------------------------

export async function listApiKeys(
  workspaceId: string,
  userId: string,
): Promise<ApiKey[]> {
  const rows = await query<ApiKeyRow>(
    `SELECT id, workspace_id, user_id, name, key_prefix, role,
            created_at, last_used_at, revoked_at
     FROM api_keys
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY created_at DESC`,
    [workspaceId, userId],
  );
  return rows.map(mapApiKey);
}

export async function getApiKey(id: string): Promise<ApiKey | null> {
  const row = await queryOne<ApiKeyRow>(
    `SELECT id, workspace_id, user_id, name, key_prefix, role,
            created_at, last_used_at, revoked_at
     FROM api_keys WHERE id = $1`,
    [id],
  );
  return row ? mapApiKey(row) : null;
}

export async function createApiKey(input: {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  role: WorkspaceRole;
}): Promise<ApiKey> {
  const row = await queryOne<ApiKeyRow>(
    `INSERT INTO api_keys (id, workspace_id, user_id, name, key_hash, key_prefix, role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, workspace_id, user_id, name, key_prefix, role,
               created_at, last_used_at, revoked_at`,
    [
      input.id,
      input.workspaceId,
      input.userId,
      input.name,
      input.keyHash,
      input.keyPrefix,
      input.role,
      Date.now(),
    ],
  );
  return mapApiKey(row!);
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE api_keys SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL`,
    [Date.now(), id],
  );
  return result.rowCount! > 0;
}

/** What a valid API key resolves to at request time. */
export interface ApiKeyPrincipal {
  apiKeyId: string;
  /** The ceiling stored on the key itself. */
  keyRole: WorkspaceRole;
  /** The user's current workspace role — may have changed since key creation. */
  memberRole: WorkspaceRole;
  workspaceId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

/**
 * Resolve a key hash to its principal in one round-trip, stamping
 * last_used_at as a side effect. Joining through workspace_members means a
 * removed member's keys stop resolving the moment their membership row is
 * gone — no separate cleanup needed.
 */
export async function findMemberByApiKeyHash(
  keyHash: string,
): Promise<ApiKeyPrincipal | null> {
  const row = await queryOne<{
    api_key_id: string;
    key_role: WorkspaceRole;
    member_role: WorkspaceRole;
    workspace_id: string;
    user_id: string;
    email: string;
    name: string | null;
    image: string | null;
  }>(
    `UPDATE api_keys ak
     SET last_used_at = $2
     FROM workspace_members wm, "user" u
     WHERE ak.key_hash = $1
       AND ak.revoked_at IS NULL
       AND wm.workspace_id = ak.workspace_id
       AND wm.user_id = ak.user_id
       AND u.id = ak.user_id
     RETURNING ak.id AS api_key_id, ak.role AS key_role, wm.role AS member_role,
               ak.workspace_id, u.id AS user_id, u.email, u.name, u.image`,
    [keyHash, Date.now()],
  );
  if (!row) return null;
  return {
    apiKeyId: row.api_key_id,
    keyRole: row.key_role,
    memberRole: row.member_role,
    workspaceId: row.workspace_id,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      image: row.image,
    },
  };
}
