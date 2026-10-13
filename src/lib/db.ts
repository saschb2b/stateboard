import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { newId, newShareToken } from "./ids";
import { evaluateRelease } from "./readiness";
import {
  captureDecisionAssets,
  cleanupReleaseAssets,
  readReleaseAssetBytes,
} from "./release-assets";
import {
  CHECK_CATEGORIES,
  COMPONENT_KINDS,
  ReleaseError,
  type Capability,
  type ProductComponent,
  type CapabilityComponent,
  type ComponentDependency,
  type RegionCapability,
  type ReleaseAssessment,
  type ReleaseCapability,
  type ReleaseCheck,
  type ReleaseEvidence,
  type ReleaseDecision,
  type ReleaseAsset,
  type ReleaseShareLink,
  type PublicReleaseProjection,
  type ProductContext,
  type ReleaseDetail,
  type ProductMutation,
  type ReleaseMutation,
  type CreateAssessmentInput,
  type DecisionInput,
  type ReleaseActor,
  type ReleaseSnapshot,
  type ReleaseWorkspace,
  type ReleaseOverview,
} from "./release-types";
import type {
  ApiKey,
  Board,
  Region,
  RegionState,
  Screen,
  ScreenWithRegions,
  ShareLink,
  UserRef,
  WorkspaceApiKey,
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
const releaseTransaction = new AsyncLocalStorage<PoolClient>();

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
  const result = await (releaseTransaction.getStore() ?? getPool()).query<R>(
    sql,
    params,
  );
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
  expires_at: string | null;
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
    expiresAt: row.expires_at === null ? null : num(row.expires_at),
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

async function addMemberInternal(input: {
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

async function updateMemberRoleInternal(input: {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
}): Promise<boolean> {
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
    `UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2`,
    [input.workspaceId, input.userId, input.role],
  );
  return result.rowCount! > 0;
}

async function removeMemberInternal(input: {
  workspaceId: string;
  userId: string;
}): Promise<boolean> {
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
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

async function updateBoardInternal(
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

async function deleteBoardInternal(id: string): Promise<boolean> {
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
    `DELETE FROM boards WHERE id = $1`,
    [id],
  );
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

async function createScreenInternal(
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

async function updateScreenInternal(
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
async function updateScreenImageInternal(
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

async function deleteScreenInternal(
  id: string,
  actorId: string,
): Promise<boolean> {
  const existing = await getScreen(id);
  if (!existing) return false;
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
    `DELETE FROM screens WHERE id = $1`,
    [id],
  );
  if (result.rowCount! > 0) await touchBoard(existing.boardId, actorId);
  return result.rowCount! > 0;
}

/**
 * Set screen order for a board from a fully-specified id list. `orderedIds`
 * must be a permutation of exactly this board's screens (no missing, extra,
 * duplicate, or foreign ids), or null is returned and nothing is written.
 * Positions become the array indices in one atomic UPDATE.
 */
async function reorderScreensInternal(
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

async function createRegionInternal(
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

async function updateRegionInternal(
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

async function deleteRegionInternal(
  id: string,
  actorId: string,
): Promise<boolean> {
  const existing = await getRegion(id);
  if (!existing) return false;
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
    `DELETE FROM regions WHERE id = $1`,
    [id],
  );
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
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
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
            created_at, expires_at, last_used_at, revoked_at
     FROM api_keys
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY created_at DESC`,
    [workspaceId, userId],
  );
  return rows.map(mapApiKey);
}

/**
 * Every key in the workspace with its owner's identity — the owner-only
 * governance view. Owners need to see (and be able to revoke) keys they
 * didn't create; a credential nobody can inventory is a liability.
 */
export async function listWorkspaceApiKeys(
  workspaceId: string,
): Promise<WorkspaceApiKey[]> {
  const rows = await query<
    ApiKeyRow & { user_name: string | null; user_email: string | null }
  >(
    `SELECT ak.id, ak.workspace_id, ak.user_id, ak.name, ak.key_prefix, ak.role,
            ak.created_at, ak.expires_at, ak.last_used_at, ak.revoked_at,
            u.name AS user_name, u.email AS user_email
     FROM api_keys ak
     LEFT JOIN "user" u ON u.id = ak.user_id
     WHERE ak.workspace_id = $1
     ORDER BY ak.created_at DESC`,
    [workspaceId],
  );
  return rows.map((row) => ({
    ...mapApiKey(row),
    userName: row.user_name,
    userEmail: row.user_email,
  }));
}

export async function getApiKey(id: string): Promise<ApiKey | null> {
  const row = await queryOne<ApiKeyRow>(
    `SELECT id, workspace_id, user_id, name, key_prefix, role,
            created_at, expires_at, last_used_at, revoked_at
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
  expiresAt: number | null;
}): Promise<ApiKey> {
  const row = await queryOne<ApiKeyRow>(
    `INSERT INTO api_keys (id, workspace_id, user_id, name, key_hash, key_prefix, role, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, workspace_id, user_id, name, key_prefix, role,
               created_at, expires_at, last_used_at, revoked_at`,
    [
      input.id,
      input.workspaceId,
      input.userId,
      input.name,
      input.keyHash,
      input.keyPrefix,
      input.role,
      Date.now(),
      input.expiresAt,
    ],
  );
  return mapApiKey(row!);
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const result = await (releaseTransaction.getStore() ?? getPool()).query(
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
 * gone, and the expires_at guard makes expiry pure lookup-time enforcement —
 * no separate cleanup needed for either.
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
       AND (ak.expires_at IS NULL OR ak.expires_at > $2)
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

// ----- release readiness ----------------------------------------------------

async function inReleaseTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (releaseTransaction.getStore()) return operation();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await releaseTransaction.run(client, operation);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "23505")
        throw new ReleaseError(
          409,
          "This record or relationship already exists",
        );
      if (error.code === "23503" || error.code === "23514")
        throw new ReleaseError(
          400,
          "The requested relationship or release context is invalid",
        );
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Shared lock order: workspace, board/source, assessment. All nested queries use this transaction. */
async function lockReleaseWorkspace(workspaceId: string): Promise<void> {
  await query(`SELECT id FROM workspaces WHERE id = $1 FOR UPDATE`, [
    workspaceId,
  ]);
}

async function lockReleaseBoard(
  boardId: string,
  workspaceId?: string,
): Promise<Board> {
  const row = await queryOne<BoardRow>(
    `SELECT * FROM boards WHERE id = $1 FOR UPDATE`,
    [boardId],
  );
  if (!row || (workspaceId && row.workspace_id !== workspaceId))
    throw new ReleaseError(404, "board not found");
  return mapBoard(row);
}

async function assertReleaseMember(
  workspaceId: string,
  actor: ReleaseActor,
  owner = false,
): Promise<void> {
  if (owner && actor.credentialKind !== "session")
    throw new ReleaseError(403, "A current owner browser session is required");
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 FOR SHARE`,
    [workspaceId, actor.userId],
  );
  if (
    !row ||
    (owner ? row.role !== "owner" : !["owner", "editor"].includes(row.role))
  )
    throw new ReleaseError(
      403,
      owner
        ? "Requires current owner membership"
        : "Requires current editor membership",
    );
  if (actor.credentialKind === "api_key") {
    if (!actor.credentialId)
      throw new ReleaseError(403, "API key attribution is required");
    const key = await queryOne<{ role: string }>(
      `SELECT role FROM api_keys WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>$4) FOR SHARE`,
      [actor.credentialId, workspaceId, actor.userId, Date.now()],
    );
    if (!key || !["owner", "editor"].includes(key.role))
      throw new ReleaseError(
        403,
        "API key is revoked, expired, or lacks editor permission",
      );
  }
}

async function releaseAudit(
  workspaceId: string,
  boardId: string,
  actor: ReleaseActor,
  action: AuditAction,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await writeAudit({
    workspaceId,
    boardId,
    actorId: actor.userId,
    action,
    targetType,
    targetId,
    meta: {
      ...meta,
      credentialKind: actor.credentialKind,
      credentialId: actor.credentialId ?? null,
    },
  });
}

const RELEASE_NUMBER_FIELDS = new Set([
  "definitionRevision",
  "revision",
  "createdAt",
  "updatedAt",
  "archivedAt",
  "observedAt",
  "receivedAt",
  "sequence",
  "checkRevision",
  "maxAgeMs",
  "expiresAt",
  "revokedAt",
  "sizeBytes",
  "width",
  "height",
]);
function releaseMap<T>(row: QueryResultRow): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const name = key.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
    mapped[name] =
      value !== null && RELEASE_NUMBER_FIELDS.has(name) ? Number(value) : value;
  }
  return mapped as T;
}

function releaseText(
  data: Record<string, unknown>,
  field: string,
  max = 200,
  fallback?: string,
): string {
  const value = data[field] === undefined ? fallback : data[field];
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new ReleaseError(
      400,
      `${field} must be nonempty text of at most ${max} characters`,
    );
  return value.trim();
}
function releaseOptionalText(
  data: Record<string, unknown>,
  field: string,
  max = 2000,
  fallback = "",
): string {
  const value = data[field] === undefined ? fallback : data[field];
  if (typeof value !== "string" || value.trim().length > max)
    throw new ReleaseError(
      400,
      `${field} must be text of at most ${max} characters`,
    );
  return value.trim();
}
function releaseBoolean(
  data: Record<string, unknown>,
  field: string,
  fallback?: boolean,
): boolean {
  const value = data[field] === undefined ? fallback : data[field];
  if (typeof value !== "boolean")
    throw new ReleaseError(400, `${field} must be a boolean`);
  return value;
}
function releaseInteger(
  data: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  fallback?: number,
): number {
  const value = data[field] === undefined ? fallback : data[field];
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new ReleaseError(
      400,
      `${field} must be a whole number between ${min} and ${max}`,
    );
  return value;
}
function releaseUrl(
  data: Record<string, unknown>,
  field: string,
  fallback: string | null = null,
): string | null {
  const value = data[field] === undefined ? fallback : data[field];
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2000)
    throw new ReleaseError(400, `${field} must be an HTTP(S) URL`);
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.toString();
  } catch {
    throw new ReleaseError(
      400,
      `${field} must be an HTTP(S) URL without embedded credentials`,
    );
  }
}
function releaseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ReleaseError(400, "data must be an object");
  return value as Record<string, unknown>;
}
function releaseCommandId(type: string, supplied: unknown): string {
  const creates = [
    "capability.create",
    "component.create",
    "dependency.create",
    "check.create",
    "evidence.create",
  ].includes(type);
  const requiresId = [
    "capability.update",
    "capability.archive",
    "component.update",
    "component.archive",
    "dependency.delete",
    "check.revise",
    "check.archive",
  ].includes(type);
  if (creates || !requiresId) {
    if (supplied !== undefined)
      throw new ReleaseError(
        400,
        "This command does not accept id; resource IDs are generated by the server",
      );
    return newId();
  }
  if (typeof supplied !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(supplied))
    throw new ReleaseError(400, "This command requires a valid resource id");
  return supplied;
}

async function releaseOwnerUser(
  data: Record<string, unknown>,
  workspaceId: string,
  fallback: string | null = null,
): Promise<string | null> {
  if (data.ownerUserId === undefined) return fallback;
  if (data.ownerUserId === null || data.ownerUserId === "") return null;
  const id = releaseText(data, "ownerUserId");
  if (!(await getMembership(workspaceId, id)))
    throw new ReleaseError(
      400,
      "ownerUserId must identify a current workspace member",
    );
  return id;
}
async function ensureGraphLimit(
  workspaceId: string,
  table: "components" | "component_dependencies",
): Promise<void> {
  const sql =
    table === "components"
      ? `SELECT COUNT(*)::int AS count FROM components WHERE workspace_id=$1`
      : `SELECT COUNT(*)::int AS count FROM component_dependencies d JOIN components c ON c.id=d.consumer_id WHERE c.workspace_id=$1`;
  const row = await queryOne<{ count: number }>(sql, [workspaceId]);
  if ((row?.count ?? 0) >= (table === "components" ? 500 : 2000))
    throw new ReleaseError(400, "Workspace architecture size limit reached");
}

export async function resolveCapabilityBoard(
  id: string,
  workspaceId: string,
): Promise<string | null> {
  const row = await queryOne<{ board_id: string }>(
    `SELECT c.board_id FROM capabilities c JOIN boards b ON b.id=c.board_id WHERE c.id=$1 AND b.workspace_id=$2`,
    [id, workspaceId],
  );
  return row?.board_id ?? null;
}
export async function resolveRegionBoard(
  id: string,
  workspaceId: string,
): Promise<string | null> {
  const row = await queryOne<{ board_id: string }>(
    `SELECT s.board_id FROM regions r JOIN screens s ON s.id=r.screen_id JOIN boards b ON b.id=s.board_id WHERE r.id=$1 AND b.workspace_id=$2`,
    [id, workspaceId],
  );
  return row?.board_id ?? null;
}
export async function readWorkspaceComponents(
  workspaceId: string,
): Promise<ProductComponent[]> {
  return (
    await query(
      `SELECT c.*, (c.owner_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workspace_members m WHERE m.workspace_id=c.workspace_id AND m.user_id=c.owner_user_id)) AS owner_needs_reassignment FROM components c WHERE c.workspace_id=$1 ORDER BY c.name,c.id`,
      [workspaceId],
    )
  ).map((row) => releaseMap<ProductComponent>(row));
}

async function readProductContextInternal(
  boardId: string,
  workspaceId: string,
  includeOverviews = true,
): Promise<ProductContext | null> {
  const board = await getBoard(boardId);
  if (!board || board.workspaceId !== workspaceId) return null;
  const capabilities = (
    await query(
      `SELECT c.*, (c.owner_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workspace_members m WHERE m.workspace_id=$2 AND m.user_id=c.owner_user_id)) AS owner_needs_reassignment FROM capabilities c WHERE c.board_id=$1 ORDER BY c.created_at,c.id`,
      [boardId, workspaceId],
    )
  ).map((row) => releaseMap<Capability>(row));
  const components = await readWorkspaceComponents(workspaceId);
  const capabilityComponents = (
    await query(
      `SELECT cc.* FROM capability_components cc JOIN capabilities c ON c.id=cc.capability_id WHERE c.board_id=$1 ORDER BY cc.capability_id,cc.component_id`,
      [boardId],
    )
  ).map((row) => releaseMap<CapabilityComponent>(row));
  const dependencies = (
    await query(
      `SELECT d.* FROM component_dependencies d JOIN components c ON c.id=d.consumer_id WHERE c.workspace_id=$1 ORDER BY d.id`,
      [workspaceId],
    )
  ).map((row) => releaseMap<ComponentDependency>(row));
  const regionCapabilities = (
    await query(
      `SELECT rc.* FROM region_capabilities rc JOIN capabilities c ON c.id=rc.capability_id WHERE c.board_id=$1 ORDER BY rc.region_id,rc.capability_id`,
      [boardId],
    )
  ).map((row) => releaseMap<RegionCapability>(row));
  const screens = (await getBoardWithScreens(boardId))?.screens ?? [];
  const releases = (
    await query(
      `SELECT * FROM release_assessments WHERE board_id=$1 ORDER BY created_at DESC,id`,
      [boardId],
    )
  ).map((row) => releaseMap<ReleaseAssessment>(row));
  return {
    board,
    capabilities,
    components,
    capabilityComponents,
    dependencies,
    regionCapabilities,
    screens,
    releases,
    ...(includeOverviews
      ? { releaseOverviews: await readOverviewsForAssessments(releases) }
      : {}),
  };
}

/** Overview data contains no snapshots or media and uses the same evaluator as a review. */
async function readOverviewsForAssessments(
  assessments: ReleaseAssessment[],
): Promise<ReleaseOverview[]> {
  if (assessments.length === 0) return [];
  const ids = assessments.map((assessment) => assessment.id);
  const now = Date.now();
  const scope = (
    await query(
      `SELECT * FROM release_capabilities WHERE assessment_id=ANY($1::text[])`,
      [ids],
    )
  ).map((row) => releaseMap<ReleaseCapability>(row));
  const checks = (
    await query(
      `SELECT c.id,c.assessment_id,c.subject_type,c.subject_id,c.archived_at,d.revision,d.claim,d.category,d.required,d.owner_label,d.method,d.environment,d.max_age_ms FROM release_checks c JOIN release_check_revisions d ON d.check_id=c.id AND d.revision=c.active_revision WHERE c.assessment_id=ANY($1::text[])`,
      [ids],
    )
  ).map((row) => releaseMap<ReleaseCheck>(row));
  // Select only the latest applicable observation per check, never the latest pass.
  // C collation matches the evaluator's ASCII ID tie break; sequence normally resolves it.
  const evidence = (
    await query(
      `SELECT DISTINCT ON (e.check_id) e.* FROM release_evidence e JOIN release_assessments a ON a.id=e.assessment_id JOIN release_checks c ON c.id=e.check_id JOIN release_check_revisions d ON d.check_id=c.id AND d.revision=c.active_revision WHERE e.assessment_id=ANY($1::text[]) AND e.check_revision=c.active_revision AND e.candidate_ref=a.candidate_ref AND e.environment=d.environment AND e.audience=a.audience AND e.configuration_ref=a.configuration_ref AND e.observed_at<=$2 ORDER BY e.check_id,e.observed_at DESC,e.sequence DESC,e.id COLLATE "C" DESC`,
      [ids, now],
    )
  ).map((row) => releaseMap<ReleaseEvidence>(row));
  const decisions = (
    await query(
      `SELECT DISTINCT ON (assessment_id) assessment_id,revision,decision,created_at FROM release_decisions WHERE assessment_id=ANY($1::text[]) ORDER BY assessment_id,created_at DESC,id`,
      [ids],
    )
  ).map((row) =>
    releaseMap<
      Pick<
        ReleaseDecision,
        "assessmentId" | "revision" | "decision" | "createdAt"
      >
    >(row),
  );
  return assessments.map((assessment) => {
    const readiness = evaluateRelease(
      {
        assessment,
        scope: scope.filter((item) => item.assessmentId === assessment.id),
        checks: checks.filter((item) => item.assessmentId === assessment.id),
        evidence: evidence.filter(
          (item) => item.assessmentId === assessment.id,
        ),
        decisions: [],
        assets: [],
        shares: [],
      },
      now,
    );
    const decision = decisions.find(
      (item) => item.assessmentId === assessment.id,
    );
    return {
      assessment,
      state: readiness.state,
      blockerCount: readiness.blockers.length,
      gapCount: readiness.gaps.length,
      evaluatedAt: now,
      validUntil: readiness.validUntil,
      decision: decision?.decision ?? null,
      decisionRevision: decision?.revision ?? null,
      decisionAt: decision?.createdAt ?? null,
    };
  });
}

/** Latest means newest assessment, not a product-wide score or the most recent approval. */
export async function readLatestReleaseOverviews(
  workspaceId: string,
  boardIds: string[],
): Promise<Record<string, ReleaseOverview>> {
  if (boardIds.length === 0) return {};
  return inReleaseReadTransaction(async () => {
    const assessments = (
      await query(
        `SELECT DISTINCT ON (r.board_id) r.* FROM release_assessments r JOIN boards b ON b.id=r.board_id WHERE b.workspace_id=$1 AND r.board_id=ANY($2::text[]) ORDER BY r.board_id,r.created_at DESC,r.id`,
        [workspaceId, boardIds],
      )
    ).map((row) => releaseMap<ReleaseAssessment>(row));
    return Object.fromEntries(
      (await readOverviewsForAssessments(assessments)).map((overview) => [
        overview.assessment.boardId,
        overview,
      ]),
    );
  });
}

async function readReleaseDetailInternal(
  releaseId: string,
  workspaceId: string,
): Promise<ReleaseDetail | null> {
  const row = await queryOne(
    `SELECT r.* FROM release_assessments r JOIN boards b ON b.id=r.board_id WHERE r.id=$1 AND b.workspace_id=$2`,
    [releaseId, workspaceId],
  );
  if (!row) return null;
  const assessment = releaseMap<ReleaseAssessment>(row);
  const scope = (
    await query(
      `SELECT * FROM release_capabilities WHERE assessment_id=$1 ORDER BY capability_id`,
      [releaseId],
    )
  ).map((r) => releaseMap<ReleaseCapability>(r));
  const checks = (
    await query(
      `SELECT c.id,c.assessment_id,c.subject_type,c.subject_id,c.archived_at,d.revision,d.claim,d.category,d.required,d.owner_label,d.method,d.environment,d.max_age_ms FROM release_checks c JOIN release_check_revisions d ON d.check_id=c.id AND d.revision=c.active_revision WHERE c.assessment_id=$1 ORDER BY c.id`,
      [releaseId],
    )
  ).map((r) => releaseMap<ReleaseCheck>(r));
  const evidence = (
    await query(
      `SELECT * FROM release_evidence WHERE assessment_id=$1 ORDER BY observed_at DESC,sequence DESC`,
      [releaseId],
    )
  ).map((r) => releaseMap<ReleaseEvidence>(r));
  const decisions = (
    await query(
      `SELECT * FROM release_decisions WHERE assessment_id=$1 ORDER BY created_at DESC,id`,
      [releaseId],
    )
  ).map((r) => releaseMap<ReleaseDecision>(r));
  const shares = (
    await query(
      `SELECT s.* FROM release_share_links s JOIN release_decisions d ON d.id=s.decision_id WHERE d.assessment_id=$1 ORDER BY s.created_at DESC`,
      [releaseId],
    )
  ).map((r) => releaseMap<ReleaseShareLink>(r));
  const assets = (
    await query(
      `SELECT * FROM release_assets WHERE assessment_id=$1 ORDER BY created_at,id`,
      [releaseId],
    )
  ).map((r) => releaseMap<ReleaseAsset>(r));
  return { assessment, scope, checks, evidence, decisions, shares, assets };
}

/** Existing visual writes call this while their board row is locked. */
export async function bumpProductReviews(boardId: string): Promise<void> {
  await query(
    `SELECT id FROM release_assessments WHERE board_id=$1 ORDER BY id FOR UPDATE`,
    [boardId],
  );
  await query(
    `UPDATE release_assessments SET revision=revision+1,updated_at=$2 WHERE board_id=$1`,
    [boardId, Date.now()],
  );
}
export async function withReleaseSourceLock<T>(
  boardId: string,
  operation: () => Promise<T>,
): Promise<T> {
  return inReleaseTransaction(async () => {
    const board = await getBoard(boardId);
    if (!board) throw new ReleaseError(404, "board not found");
    await lockReleaseWorkspace(board.workspaceId);
    await lockReleaseBoard(boardId);
    return operation();
  });
}

async function requireCapability(
  id: string,
  boardId: string,
): Promise<Capability> {
  const row = await queryOne(
    `SELECT * FROM capabilities WHERE id=$1 AND board_id=$2`,
    [id, boardId],
  );
  if (!row) throw new ReleaseError(404, "capability not found");
  return releaseMap<Capability>(row);
}
async function requireComponent(
  id: string,
  workspaceId: string,
): Promise<ProductComponent> {
  const row = await queryOne(
    `SELECT * FROM components WHERE id=$1 AND workspace_id=$2`,
    [id, workspaceId],
  );
  if (!row) throw new ReleaseError(404, "component not found");
  return releaseMap<ProductComponent>(row);
}

export async function mutateProduct(
  workspaceId: string,
  boardId: string,
  command: ProductMutation,
  actor: ReleaseActor,
): Promise<ProductContext> {
  const data = releaseRecord(command.data);
  return inReleaseTransaction(async () => {
    await lockReleaseWorkspace(workspaceId);
    await lockReleaseBoard(boardId, workspaceId);
    await assertReleaseMember(workspaceId, actor);
    const now = Date.now();
    const id = releaseCommandId(command.type, command.id);
    let allBoards = false;
    switch (command.type) {
      case "capability.create": {
        const count = await queryOne<{ count: number }>(
          `SELECT COUNT(*)::int AS count FROM capabilities WHERE board_id=$1`,
          [boardId],
        );
        if ((count?.count ?? 0) >= 500)
          throw new ReleaseError(400, "Board capability size limit reached");
        await query(
          `INSERT INTO capabilities (id,board_id,name,outcome,owner_label,owner_user_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
          [
            id,
            boardId,
            releaseText(data, "name"),
            releaseText(data, "outcome", 2000),
            releaseText(data, "ownerLabel"),
            await releaseOwnerUser(data, workspaceId),
            now,
          ],
        );
        break;
      }
      case "capability.update": {
        const capability = await requireCapability(id, boardId);
        if (capability.archivedAt !== null)
          throw new ReleaseError(409, "Archived capabilities cannot be edited");
        if (
          data.definitionRevision !== undefined &&
          data.definitionRevision !== capability.definitionRevision
        )
          throw new ReleaseError(
            409,
            "Capability changed; refresh before editing",
          );
        const name = releaseText(data, "name", 200, capability.name);
        const outcome = releaseText(data, "outcome", 2000, capability.outcome);
        const meaningChanged = outcome !== capability.outcome;
        await query(
          `UPDATE capabilities SET name=$2,outcome=$3,owner_label=$4,owner_user_id=$5,definition_revision=definition_revision+$6,updated_at=$7 WHERE id=$1`,
          [
            id,
            name,
            outcome,
            releaseText(data, "ownerLabel", 200, capability.ownerLabel),
            await releaseOwnerUser(data, workspaceId, capability.ownerUserId),
            meaningChanged ? 1 : 0,
            now,
          ],
        );
        // Metadata follows current ownership; only the outcome definition is pinned.
        await query(
          `UPDATE release_capabilities SET name=$2,owner_label=$3 WHERE capability_id=$1`,
          [
            id,
            name,
            releaseText(data, "ownerLabel", 200, capability.ownerLabel),
          ],
        );
        break;
      }
      case "capability.archive":
        await requireCapability(id, boardId);
        await query(
          `UPDATE capabilities SET archived_at=COALESCE(archived_at,$2),updated_at=$2 WHERE id=$1`,
          [id, now],
        );
        break;
      case "component.create":
        await ensureGraphLimit(workspaceId, "components");
        if (!COMPONENT_KINDS.includes(data.kind as ProductComponent["kind"]))
          throw new ReleaseError(400, "Invalid component kind");
        await query(
          `INSERT INTO components(id,workspace_id,name,kind,owner_label,owner_user_id,description,reference_url,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
          [
            id,
            workspaceId,
            releaseText(data, "name"),
            data.kind,
            releaseText(data, "ownerLabel"),
            await releaseOwnerUser(data, workspaceId),
            releaseOptionalText(data, "description"),
            releaseUrl(data, "referenceUrl"),
            now,
          ],
        );
        allBoards = true;
        break;
      case "component.update": {
        const component = await requireComponent(id, workspaceId);
        if (component.archivedAt !== null)
          throw new ReleaseError(409, "Archived components cannot be edited");
        const kind = data.kind ?? component.kind;
        if (!COMPONENT_KINDS.includes(kind as ProductComponent["kind"]))
          throw new ReleaseError(400, "Invalid component kind");
        await query(
          `UPDATE components SET name=$2,kind=$3,owner_label=$4,owner_user_id=$5,description=$6,reference_url=$7,updated_at=$8 WHERE id=$1`,
          [
            id,
            releaseText(data, "name", 200, component.name),
            kind,
            releaseText(data, "ownerLabel", 200, component.ownerLabel),
            await releaseOwnerUser(data, workspaceId, component.ownerUserId),
            releaseOptionalText(
              data,
              "description",
              2000,
              component.description,
            ),
            releaseUrl(data, "referenceUrl", component.referenceUrl),
            now,
          ],
        );
        allBoards = true;
        break;
      }
      case "component.archive":
        await requireComponent(id, workspaceId);
        await query(
          `UPDATE components SET archived_at=COALESCE(archived_at,$2),updated_at=$2 WHERE id=$1`,
          [id, now],
        );
        allBoards = true;
        break;
      case "capability_component.put":
      case "capability_component.delete": {
        const capabilityId = releaseText(data, "capabilityId");
        const componentId = releaseText(data, "componentId");
        const capability = await requireCapability(capabilityId, boardId);
        const component = await requireComponent(componentId, workspaceId);
        if (command.type.endsWith("put")) {
          if (capability.archivedAt !== null || component.archivedAt !== null)
            throw new ReleaseError(409, "Archived entities cannot be linked");
          await query(
            `INSERT INTO capability_components(capability_id,component_id,relation,required,description) VALUES($1,$2,$3,$4,$5) ON CONFLICT(capability_id,component_id) DO UPDATE SET relation=EXCLUDED.relation,required=EXCLUDED.required,description=EXCLUDED.description`,
            [
              capabilityId,
              componentId,
              releaseText(data, "relation"),
              releaseBoolean(data, "required", true),
              releaseOptionalText(data, "description"),
            ],
          );
        } else
          await query(
            `DELETE FROM capability_components WHERE capability_id=$1 AND component_id=$2`,
            [capabilityId, componentId],
          );
        break;
      }
      case "dependency.create": {
        await ensureGraphLimit(workspaceId, "component_dependencies");
        const consumerId = releaseText(data, "consumerId");
        const providerId = releaseText(data, "providerId");
        const consumer = await requireComponent(consumerId, workspaceId);
        const provider = await requireComponent(providerId, workspaceId);
        if (consumer.archivedAt !== null || provider.archivedAt !== null)
          throw new ReleaseError(409, "Archived components cannot be linked");
        await query(
          `INSERT INTO component_dependencies(id,consumer_id,provider_id,relation,required,description) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(consumer_id,provider_id,relation) DO UPDATE SET required=EXCLUDED.required,description=EXCLUDED.description`,
          [
            id,
            consumerId,
            providerId,
            releaseText(data, "relation"),
            releaseBoolean(data, "required", true),
            releaseOptionalText(data, "description"),
          ],
        );
        allBoards = true;
        break;
      }
      case "dependency.delete":
        if (
          data.consumerId !== undefined &&
          !(await queryOne(
            `SELECT id FROM component_dependencies WHERE id=$1 AND consumer_id=$2`,
            [id, releaseText(data, "consumerId")],
          ))
        )
          throw new ReleaseError(404, "dependency not found for this consumer");
        if (
          !(await queryOne(
            `SELECT d.id FROM component_dependencies d JOIN components c ON c.id=d.consumer_id WHERE d.id=$1 AND c.workspace_id=$2`,
            [id, workspaceId],
          ))
        )
          throw new ReleaseError(404, "dependency not found");
        await query(`DELETE FROM component_dependencies WHERE id=$1`, [id]);
        allBoards = true;
        break;
      case "region_capability.put":
      case "region_capability.delete": {
        const regionId = releaseText(data, "regionId");
        const capabilityId = releaseText(data, "capabilityId");
        if ((await resolveRegionBoard(regionId, workspaceId)) !== boardId)
          throw new ReleaseError(404, "region not found in board");
        const capability = await requireCapability(capabilityId, boardId);
        if (command.type.endsWith("put")) {
          if (capability.archivedAt !== null)
            throw new ReleaseError(409, "Archived capability cannot be linked");
          await query(
            `INSERT INTO region_capabilities(region_id,capability_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            [regionId, capabilityId],
          );
        } else
          await query(
            `DELETE FROM region_capabilities WHERE region_id=$1 AND capability_id=$2`,
            [regionId, capabilityId],
          );
        break;
      }
      default:
        throw new ReleaseError(400, "Unknown product mutation");
    }
    if (allBoards) {
      const boards = await query<{ id: string }>(
        `SELECT id FROM boards WHERE workspace_id=$1 ORDER BY id FOR UPDATE`,
        [workspaceId],
      );
      for (const board of boards) await bumpProductReviews(board.id);
    } else await bumpProductReviews(boardId);
    await touchBoard(boardId, actor.userId);
    await releaseAudit(
      workspaceId,
      boardId,
      actor,
      command.type,
      command.type.startsWith("component") ? "component" : "capability",
      id,
      { type: command.type, data },
    );
    return (await readProductContext(boardId, workspaceId))!;
  });
}

async function lockAssessment(
  releaseId: string,
  workspaceId: string,
): Promise<ReleaseAssessment> {
  const found = await queryOne<{ board_id: string }>(
    `SELECT r.board_id FROM release_assessments r JOIN boards b ON b.id=r.board_id WHERE r.id=$1 AND b.workspace_id=$2`,
    [releaseId, workspaceId],
  );
  if (!found) throw new ReleaseError(404, "assessment not found");
  await lockReleaseWorkspace(workspaceId);
  await lockReleaseBoard(found.board_id, workspaceId);
  const row = await queryOne(
    `SELECT * FROM release_assessments WHERE id=$1 FOR UPDATE`,
    [releaseId],
  );
  if (!row) throw new ReleaseError(404, "assessment not found");
  return releaseMap<ReleaseAssessment>(row);
}
function expectReleaseRevision(
  assessment: ReleaseAssessment,
  expected: unknown,
): void {
  if (
    typeof expected !== "number" ||
    !Number.isSafeInteger(expected) ||
    expected < 1
  )
    throw new ReleaseError(400, "expectedRevision must be a positive integer");
  if (expected !== assessment.revision)
    throw new ReleaseError(
      409,
      "Assessment changed; refresh the reviewed revision",
    );
}
async function incrementReleaseRevision(id: string): Promise<void> {
  await query(
    `UPDATE release_assessments SET revision=revision+1,updated_at=$2 WHERE id=$1`,
    [id, Date.now()],
  );
}
function validateCandidateRef(value: string): void {
  if (
    /^(latest|main|master|develop|development|head)$/i.test(value) ||
    /^refs\/heads\//i.test(value) ||
    /:latest$/i.test(value)
  )
    throw new ReleaseError(
      400,
      "candidateRef must identify an immutable artifact or pinned manifest, not a branch or latest tag",
    );
}
export async function createReleaseAssessment(
  workspaceId: string,
  boardId: string,
  input: CreateAssessmentInput,
  actor: ReleaseActor,
): Promise<ReleaseDetail> {
  const data = releaseRecord(input);
  const candidateRef = releaseText(data, "candidateRef", 4000);
  validateCandidateRef(candidateRef);
  if (
    !Array.isArray(data.capabilityIds) ||
    data.capabilityIds.length > 500 ||
    !data.capabilityIds.every((id) => typeof id === "string") ||
    new Set(data.capabilityIds).size !== data.capabilityIds.length
  )
    throw new ReleaseError(
      400,
      "capabilityIds must be a unique list of at most 500 IDs",
    );
  return inReleaseTransaction(async () => {
    await lockReleaseWorkspace(workspaceId);
    await lockReleaseBoard(boardId, workspaceId);
    await assertReleaseMember(workspaceId, actor);
    const id = newId();
    const now = Date.now();
    await query(
      `INSERT INTO release_assessments(id,board_id,candidate_label,candidate_ref,validation_environment,target_environment,audience,configuration_ref,owner_label,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
      [
        id,
        boardId,
        releaseText(data, "candidateLabel"),
        candidateRef,
        releaseText(data, "validationEnvironment"),
        releaseText(data, "targetEnvironment"),
        releaseText(data, "audience", 1000),
        releaseText(data, "configurationRef", 4000),
        releaseText(data, "ownerLabel"),
        now,
      ],
    );
    for (const capabilityId of data.capabilityIds as string[]) {
      const capability = await requireCapability(capabilityId, boardId);
      if (capability.archivedAt !== null)
        throw new ReleaseError(400, "Cannot include an archived capability");
      await query(
        `INSERT INTO release_capabilities(assessment_id,capability_id,name,outcome,definition_revision,owner_label) VALUES($1,$2,$3,$4,$5,$6)`,
        [
          id,
          capability.id,
          capability.name,
          capability.outcome,
          capability.definitionRevision,
          capability.ownerLabel,
        ],
      );
    }
    await releaseAudit(
      workspaceId,
      boardId,
      actor,
      "release.create",
      "release",
      id,
      { capabilityIds: data.capabilityIds },
    );
    return (await readReleaseDetail(id, workspaceId))!;
  });
}

async function insertCheckRevision(
  check: ReleaseCheck,
  now = Date.now(),
): Promise<void> {
  await query(
    `INSERT INTO release_check_revisions(check_id,revision,claim,category,required,owner_label,method,environment,max_age_ms,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      check.id,
      check.revision,
      check.claim,
      check.category,
      check.required,
      check.ownerLabel,
      check.method,
      check.environment,
      check.maxAgeMs,
      now,
    ],
  );
}
function checkDefinition(
  data: Record<string, unknown>,
  assessment: ReleaseAssessment,
  old?: ReleaseCheck,
): Pick<
  ReleaseCheck,
  | "claim"
  | "category"
  | "required"
  | "ownerLabel"
  | "method"
  | "environment"
  | "maxAgeMs"
> {
  const category = data.category ?? old?.category ?? "functional";
  if (!CHECK_CATEGORIES.includes(category as ReleaseCheck["category"]))
    throw new ReleaseError(400, "Invalid check category");
  const environment = releaseText(
    data,
    "environment",
    200,
    old?.environment ?? assessment.validationEnvironment,
  );
  if (
    ![assessment.validationEnvironment, assessment.targetEnvironment].includes(
      environment,
    )
  )
    throw new ReleaseError(
      400,
      "Check environment must be the assessment validation or target environment",
    );
  return {
    claim: releaseText(data, "claim", 2000, old?.claim),
    category: category as ReleaseCheck["category"],
    required: releaseBoolean(data, "required", old?.required ?? true),
    ownerLabel: releaseText(
      data,
      "ownerLabel",
      200,
      old?.ownerLabel ?? assessment.ownerLabel,
    ),
    method: releaseText(data, "method", 1000, old?.method ?? "manual"),
    environment,
    maxAgeMs: releaseInteger(
      data,
      "maxAgeMs",
      1,
      366 * 86400000,
      old?.maxAgeMs ?? 86400000,
    ),
  };
}

function evidenceInput(
  data: Record<string, unknown>,
  assessment: ReleaseAssessment,
  actor: ReleaseActor,
): Omit<ReleaseEvidence, "id" | "sequence" | "receivedAt"> {
  const result = data.result;
  if (!["pass", "fail", "inconclusive"].includes(result as string))
    throw new ReleaseError(400, "result must be pass, fail or inconclusive");
  return {
    assessmentId: assessment.id,
    checkId: releaseText(data, "checkId"),
    checkRevision: releaseInteger(data, "checkRevision", 1, 2147483647),
    candidateRef: releaseText(data, "candidateRef", 4000),
    environment: releaseText(data, "environment"),
    audience: releaseText(data, "audience", 1000),
    configurationRef: releaseText(data, "configurationRef", 4000),
    result: result as ReleaseEvidence["result"],
    summary: releaseText(data, "summary", 10000),
    source: releaseText(data, "source"),
    runRef: releaseText(data, "runRef", 1000),
    eventId: releaseText(data, "eventId", 1000),
    observedAt: releaseInteger(data, "observedAt", 1, Date.now()),
    actorId: actor.userId,
    actorName: actor.name,
    credentialKind: actor.credentialKind,
    credentialId: actor.credentialId ?? null,
    referenceUrl: releaseUrl(data, "referenceUrl"),
  };
}
function sameEvidence(
  existing: ReleaseEvidence,
  input: Omit<ReleaseEvidence, "id" | "sequence" | "receivedAt">,
): boolean {
  const fields: (keyof typeof input)[] = [
    "assessmentId",
    "checkId",
    "checkRevision",
    "candidateRef",
    "environment",
    "audience",
    "configurationRef",
    "result",
    "summary",
    "source",
    "runRef",
    "eventId",
    "observedAt",
    "referenceUrl",
  ];
  return (
    fields.every((field) => existing[field] === input[field]) &&
    existing.actorId === input.actorId &&
    existing.credentialKind === input.credentialKind &&
    (existing.credentialId ?? null) === (input.credentialId ?? null)
  );
}

export async function mutateRelease(
  workspaceId: string,
  releaseId: string,
  command: ReleaseMutation,
  actor: ReleaseActor,
): Promise<ReleaseDetail> {
  const data = releaseRecord(command.data);
  return inReleaseTransaction(async () => {
    const assessment = await lockAssessment(releaseId, workspaceId);
    await assertReleaseMember(workspaceId, actor);
    const id = releaseCommandId(command.type, command.id);
    let evidence: ReturnType<typeof evidenceInput> | null = null;
    if (command.type === "evidence.create") {
      evidence = evidenceInput(data, assessment, actor);
      const prior = await queryOne(
        `SELECT * FROM release_evidence WHERE assessment_id=$1 AND source=$2 AND event_id=$3`,
        [releaseId, evidence.source, evidence.eventId],
      );
      if (prior) {
        if (!sameEvidence(releaseMap<ReleaseEvidence>(prior), evidence))
          throw new ReleaseError(
            409,
            "Evidence event identity was already used with a different payload or producer",
          );
        return (await readReleaseDetail(releaseId, workspaceId))!;
      }
    }
    expectReleaseRevision(assessment, command.expectedRevision);
    const now = Date.now();
    let action: AuditAction;
    switch (command.type) {
      case "scope.put": {
        const capabilityId = releaseText(data, "capabilityId");
        const capability = await requireCapability(
          capabilityId,
          assessment.boardId,
        );
        const included = releaseBoolean(data, "included", true);
        if (included && capability.archivedAt !== null)
          throw new ReleaseError(409, "Cannot include an archived capability");
        const existingRow = await queryOne(
          `SELECT * FROM release_capabilities WHERE assessment_id=$1 AND capability_id=$2`,
          [releaseId, capabilityId],
        );
        const existing = existingRow
          ? releaseMap<ReleaseCapability>(existingRow)
          : null;
        const adopt = releaseBoolean(data, "adoptLatest", false);
        const pinned = adopt || !existing ? capability : existing;
        const reason = releaseOptionalText(
          data,
          "scopeReason",
          2000,
          existing?.scopeReason ?? "",
        );
        if (!included && !reason)
          throw new ReleaseError(400, "An exclusion requires a scopeReason");
        await query(
          `INSERT INTO release_capabilities(assessment_id,capability_id,name,outcome,definition_revision,owner_label,included,scope_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(assessment_id,capability_id) DO UPDATE SET name=EXCLUDED.name,outcome=EXCLUDED.outcome,definition_revision=EXCLUDED.definition_revision,owner_label=EXCLUDED.owner_label,included=EXCLUDED.included,scope_reason=EXCLUDED.scope_reason`,
          [
            releaseId,
            capabilityId,
            pinned.name,
            pinned.outcome,
            pinned.definitionRevision,
            pinned.ownerLabel,
            included,
            reason,
          ],
        );
        if (!included)
          await query(
            `UPDATE release_checks SET archived_at=COALESCE(archived_at,$3) WHERE assessment_id=$1 AND subject_type='capability' AND subject_id=$2`,
            [releaseId, capabilityId, now],
          );
        if (
          adopt &&
          existing &&
          existing.definitionRevision !== capability.definitionRevision
        ) {
          const detail = (await readReleaseDetail(releaseId, workspaceId))!;
          for (const check of detail.checks.filter(
            (c) =>
              c.subjectType === "capability" &&
              c.subjectId === capabilityId &&
              c.archivedAt === null,
          )) {
            await insertCheckRevision(
              { ...check, revision: check.revision + 1 },
              now,
            );
            await query(
              `UPDATE release_checks SET active_revision=active_revision+1 WHERE id=$1`,
              [check.id],
            );
          }
        }
        action = "release.scope";
        break;
      }
      case "check.create": {
        const detail = (await readReleaseDetail(releaseId, workspaceId))!;
        if (detail.checks.length >= 500)
          throw new ReleaseError(400, "Assessment check size limit reached");
        const subjectType = data.subjectType;
        if (
          !["capability", "component", "release"].includes(
            subjectType as string,
          )
        )
          throw new ReleaseError(400, "Invalid check subjectType");
        let subjectId: string | null = null;
        if (subjectType === "release") {
          if (
            data.subjectId !== undefined &&
            data.subjectId !== null &&
            data.subjectId !== ""
          )
            throw new ReleaseError(
              400,
              "Release checks must not have subjectId",
            );
        } else {
          subjectId = releaseText(data, "subjectId");
          if (subjectType === "capability") {
            if (
              !detail.scope.some(
                (c) => c.capabilityId === subjectId && c.included,
              )
            )
              throw new ReleaseError(
                400,
                "Check capability must be included in this assessment",
              );
          } else {
            const component = await requireComponent(subjectId, workspaceId);
            if (component.archivedAt !== null)
              throw new ReleaseError(409, "Cannot check an archived component");
            const context = (await readProductContextInternal(
              assessment.boardId,
              workspaceId,
              false,
            ))!;
            const related = new Set(
              context.capabilityComponents
                .filter((link) =>
                  detail.scope.some(
                    (c) => c.included && c.capabilityId === link.capabilityId,
                  ),
                )
                .map((link) => link.componentId),
            );
            for (let changed = true; changed;) {
              changed = false;
              for (const edge of context.dependencies)
                if (
                  related.has(edge.consumerId) &&
                  !related.has(edge.providerId)
                ) {
                  related.add(edge.providerId);
                  changed = true;
                }
            }
            if (!related.has(subjectId))
              throw new ReleaseError(
                400,
                "Check component must be linked to an included capability or its dependencies",
              );
          }
        }
        const check: ReleaseCheck = {
          id,
          assessmentId: releaseId,
          subjectType: subjectType as ReleaseCheck["subjectType"],
          subjectId,
          revision: 1,
          archivedAt: null,
          ...checkDefinition(data, assessment),
        };
        await query(
          `INSERT INTO release_checks(id,assessment_id,subject_type,subject_id) VALUES($1,$2,$3,$4)`,
          [id, releaseId, subjectType, subjectId],
        );
        await insertCheckRevision(check, now);
        action = "release.check_create";
        break;
      }
      case "check.revise": {
        const check = (await readReleaseDetail(
          releaseId,
          workspaceId,
        ))!.checks.find((c) => c.id === id);
        if (!check) throw new ReleaseError(404, "check not found");
        if (check.archivedAt !== null)
          throw new ReleaseError(
            409,
            "Archived check cannot be revised; create a new check",
          );
        if (
          (data.subjectType !== undefined &&
            data.subjectType !== check.subjectType) ||
          (data.subjectId !== undefined && data.subjectId !== check.subjectId)
        )
          throw new ReleaseError(
            400,
            "Check subjects are immutable; create another check",
          );
        await insertCheckRevision(
          {
            ...check,
            ...checkDefinition(data, assessment, check),
            revision: check.revision + 1,
          },
          now,
        );
        await query(
          `UPDATE release_checks SET active_revision=active_revision+1 WHERE id=$1`,
          [id],
        );
        action = "release.check_revise";
        break;
      }
      case "check.archive":
        if (
          !(await queryOne(
            `SELECT id FROM release_checks WHERE id=$1 AND assessment_id=$2`,
            [id, releaseId],
          ))
        )
          throw new ReleaseError(404, "check not found");
        await query(
          `UPDATE release_checks SET archived_at=COALESCE(archived_at,$2) WHERE id=$1`,
          [id, now],
        );
        action = "release.check_archive";
        break;
      case "evidence.create": {
        if (!evidence) throw new ReleaseError(400, "Invalid evidence");
        const check = (await readReleaseDetail(
          releaseId,
          workspaceId,
        ))!.checks.find((c) => c.id === evidence.checkId);
        if (!check || check.archivedAt !== null)
          throw new ReleaseError(404, "active check not found");
        if (evidence.checkRevision !== check.revision)
          throw new ReleaseError(
            409,
            "Check definition changed; submit evidence for its current revision",
          );
        if (
          evidence.candidateRef !== assessment.candidateRef ||
          evidence.environment !== check.environment ||
          evidence.audience !== assessment.audience ||
          evidence.configurationRef !== assessment.configurationRef
        )
          throw new ReleaseError(
            400,
            "Evidence candidate, environment, audience or configuration does not match this check",
          );
        await query(
          `INSERT INTO release_evidence(id,assessment_id,check_id,check_revision,candidate_ref,environment,audience,configuration_ref,result,summary,source,run_ref,event_id,observed_at,received_at,actor_id,actor_name,credential_kind,reference_url,credential_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          [
            id,
            releaseId,
            evidence.checkId,
            evidence.checkRevision,
            evidence.candidateRef,
            evidence.environment,
            evidence.audience,
            evidence.configurationRef,
            evidence.result,
            evidence.summary,
            evidence.source,
            evidence.runRef,
            evidence.eventId,
            evidence.observedAt,
            now,
            actor.userId,
            actor.name,
            actor.credentialKind,
            evidence.referenceUrl,
            actor.credentialId ?? null,
          ],
        );
        action = "release.evidence";
        break;
      }
      default:
        throw new ReleaseError(400, "Unknown release mutation");
    }
    await incrementReleaseRevision(releaseId);
    await releaseAudit(
      workspaceId,
      assessment.boardId,
      actor,
      action,
      command.type.startsWith("check")
        ? "release_check"
        : command.type === "evidence.create"
          ? "release_evidence"
          : "release",
      id,
      { assessmentId: releaseId, reviewedRevision: assessment.revision },
    );
    return (await readReleaseDetail(releaseId, workspaceId))!;
  });
}

export async function readReleaseCheckRevisions(
  workspaceId: string,
  releaseId: string,
  checkId: string,
): Promise<ReleaseCheck[]> {
  if (!(await readReleaseDetail(releaseId, workspaceId)))
    throw new ReleaseError(404, "assessment not found");
  return (
    await query(
      `SELECT c.id,c.assessment_id,c.subject_type,c.subject_id,c.archived_at,d.revision,d.claim,d.category,d.required,d.owner_label,d.method,d.environment,d.max_age_ms FROM release_checks c JOIN release_check_revisions d ON d.check_id=c.id WHERE c.id=$1 AND c.assessment_id=$2 ORDER BY d.revision DESC`,
      [checkId, releaseId],
    )
  ).map((row) => releaseMap<ReleaseCheck>(row));
}

async function insertReleaseAsset(asset: ReleaseAsset): Promise<void> {
  await query(
    `INSERT INTO release_assets(id,assessment_id,decision_id,filename,mime_type,width,height,size_bytes,digest,label,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      asset.id,
      asset.assessmentId,
      asset.decisionId,
      asset.filename,
      asset.mimeType,
      asset.width,
      asset.height,
      asset.sizeBytes,
      asset.digest,
      asset.label,
      asset.createdAt,
    ],
  );
}
export async function createReleaseAsset(
  workspaceId: string,
  releaseId: string,
  metadata: ReleaseAsset,
  actor: ReleaseActor,
  expectedRevision: number,
): Promise<ReleaseDetail> {
  const data = releaseRecord(metadata);
  if (
    metadata.assessmentId !== releaseId ||
    metadata.decisionId !== null ||
    !/^[A-Za-z0-9_-]{12}\.(png|jpg|jpeg|webp|gif)$/.test(metadata.filename) ||
    !/^[a-f0-9]{64}$/.test(metadata.digest)
  )
    throw new ReleaseError(400, "Invalid private asset metadata");
  releaseInteger(data, "sizeBytes", 1, 25 * 1024 * 1024);
  releaseInteger(data, "width", 1, 20000);
  releaseInteger(data, "height", 1, 20000);
  releaseText(data, "id");
  releaseText(data, "label");
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
      metadata.mimeType,
    ) ||
    metadata.width * metadata.height > 100000000
  )
    throw new ReleaseError(400, "Invalid private image dimensions or MIME");
  return inReleaseTransaction(async () => {
    const assessment = await lockAssessment(releaseId, workspaceId);
    await assertReleaseMember(workspaceId, actor);
    expectReleaseRevision(assessment, expectedRevision);
    const count = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM release_assets WHERE assessment_id=$1`,
      [releaseId],
    );
    if ((count?.count ?? 0) >= 500)
      throw new ReleaseError(400, "Assessment asset limit reached");
    await insertReleaseAsset(metadata);
    await incrementReleaseRevision(releaseId);
    await releaseAudit(
      workspaceId,
      assessment.boardId,
      actor,
      "release.asset",
      "release_asset",
      metadata.id,
      { assessmentId: releaseId },
    );
    return (await readReleaseDetail(releaseId, workspaceId))!;
  });
}

export async function recordReleaseDecision(
  workspaceId: string,
  releaseId: string,
  input: DecisionInput,
  actor: ReleaseActor,
): Promise<ReleaseDetail> {
  const data = releaseRecord(input);
  if (!["approved", "held"].includes(data.decision as string))
    throw new ReleaseError(400, "decision must be approved or held");
  const rationale = releaseText(data, "rationale", 10000);
  if (
    !Array.isArray(data.screenIds) ||
    data.screenIds.length > 50 ||
    !data.screenIds.every((id) => typeof id === "string") ||
    new Set(data.screenIds).size !== data.screenIds.length
  )
    throw new ReleaseError(
      400,
      "screenIds must be a unique list of at most 50 IDs",
    );
  if (
    data.assetIds !== undefined &&
    (!Array.isArray(data.assetIds) ||
      data.assetIds.length > 50 ||
      !data.assetIds.every((id) => typeof id === "string") ||
      new Set(data.assetIds).size !== data.assetIds.length)
  )
    throw new ReleaseError(
      400,
      "assetIds must be a unique list of at most 50 IDs",
    );
  const staged: ReleaseAsset[] = [];
  try {
    return await inReleaseTransaction(async () => {
      const assessment = await lockAssessment(releaseId, workspaceId);
      await assertReleaseMember(workspaceId, actor, true);
      expectReleaseRevision(assessment, input.expectedRevision);
      const detail = (await readReleaseDetail(releaseId, workspaceId))!;
      const context = (await readProductContextInternal(
        assessment.boardId,
        workspaceId,
        false,
      ))!;
      const selected = (data.screenIds as string[]).map((id) => {
        const screen = context.screens.find((s) => s.id === id);
        if (!screen)
          throw new ReleaseError(
            400,
            "Selected screenshot is not in this product board",
          );
        return screen;
      });
      const assetIds =
        data.assetIds === undefined
          ? detail.assets
              .filter((asset) => asset.decisionId === null)
              .map((asset) => asset.id)
          : (data.assetIds as string[]);
      if (assetIds.length > 50)
        throw new ReleaseError(400, "Select at most 50 retained images");
      const selectedAssets = assetIds.map((assetId) => {
        const asset = detail.assets.find(
          (candidate) => candidate.id === assetId,
        );
        if (!asset)
          throw new ReleaseError(
            400,
            "Selected retained image is not in this assessment",
          );
        return asset;
      });
      for (const asset of selectedAssets) await readReleaseAssetBytes(asset);
      // Source board lock remains held while copying. Existing visual mutations acquire it first.
      const id = newId();
      const captured = await captureDecisionAssets(selected, releaseId, id);
      staged.push(...captured.assets);
      const now = Date.now();
      const readiness = evaluateRelease(detail, now);
      if (input.decision === "approved" && readiness.state !== "ready")
        throw new ReleaseError(
          409,
          "Approval requires fresh passing evidence for every required claim",
        );
      const included = new Set(
        detail.scope.filter((c) => c.included).map((c) => c.capabilityId),
      );
      const capabilityComponents = context.capabilityComponents.filter((link) =>
        included.has(link.capabilityId),
      );
      const componentIds = new Set([
        ...capabilityComponents.map((link) => link.componentId),
        ...detail.checks
          .filter((c) => c.subjectType === "component")
          .map((c) => c.subjectId!),
      ]);
      for (let changed = true; changed;) {
        changed = false;
        for (const edge of context.dependencies)
          if (
            componentIds.has(edge.consumerId) &&
            !componentIds.has(edge.providerId)
          ) {
            componentIds.add(edge.providerId);
            changed = true;
          }
      }
      const assets = [
        ...selectedAssets.map((asset) => ({
          ...asset,
          decisionId: asset.decisionId ?? id,
        })),
        ...captured.assets,
      ];
      const retainedRegionIds = new Set(
        captured.screens.flatMap((screen) =>
          screen.regions.map((region) => region.id),
        ),
      );
      const snapshot: ReleaseSnapshot = {
        assessment,
        scope: detail.scope,
        checks: detail.checks,
        evidence: detail.evidence,
        readiness,
        components: context.components.filter((c) => componentIds.has(c.id)),
        capabilityComponents,
        dependencies: context.dependencies.filter(
          (d) =>
            componentIds.has(d.consumerId) && componentIds.has(d.providerId),
        ),
        screens: captured.screens,
        regionCapabilities: context.regionCapabilities.filter(
          (link) =>
            included.has(link.capabilityId) &&
            retainedRegionIds.has(link.regionId),
        ),
        assets,
      };
      await query(
        `INSERT INTO release_decisions(id,assessment_id,revision,decision,rationale,actor_id,actor_name,created_at,expires_at,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          releaseId,
          assessment.revision,
          input.decision,
          rationale,
          actor.userId,
          actor.name,
          now,
          readiness.validUntil,
          JSON.stringify(snapshot),
        ],
      );
      for (const asset of captured.assets) await insertReleaseAsset(asset);
      await query(
        `UPDATE release_assets SET decision_id=$2 WHERE assessment_id=$1 AND id=ANY($3::text[]) AND decision_id IS NULL`,
        [releaseId, id, selectedAssets.map((asset) => asset.id)],
      );
      await releaseAudit(
        workspaceId,
        assessment.boardId,
        actor,
        "release.decision",
        "release_decision",
        id,
        {
          assessmentId: releaseId,
          reviewedRevision: assessment.revision,
          decision: input.decision,
          readiness: readiness.state,
        },
      );
      return (await readReleaseDetail(releaseId, workspaceId))!;
    });
  } catch (error) {
    await cleanupReleaseAssets(staged);
    throw error;
  }
}

function safeReleaseProjection(
  value: PublicReleaseProjection,
  decision: ReleaseDecision,
): PublicReleaseProjection {
  const data = releaseRecord(value);
  if (
    !Array.isArray(data.capabilities) ||
    data.capabilities.length > 100 ||
    !Array.isArray(data.images) ||
    data.images.length > 50
  )
    throw new ReleaseError(400, "Invalid publication selection");
  const capabilities = data.capabilities.map((raw) => {
    const row = releaseRecord(raw);
    if (!["ready", "blocked", "needs_evidence"].includes(row.state as string))
      throw new ReleaseError(400, "Invalid outcome readiness");
    return {
      name: releaseText(row, "name"),
      outcome: releaseText(row, "outcome", 2000),
      explanation: releaseOptionalText(row, "explanation"),
      state:
        row.state as PublicReleaseProjection["capabilities"][number]["state"],
    };
  });
  const seen = new Set<string>();
  const images = data.images.map((raw) => {
    const row = releaseRecord(raw);
    const assetId = releaseText(row, "assetId");
    const asset = decision.snapshot.assets.find((a) => a.id === assetId);
    if (!asset || seen.has(assetId))
      throw new ReleaseError(
        400,
        "Publication assets must belong to this recorded decision",
      );
    seen.add(assetId);
    return {
      assetId,
      label: asset.label,
      width: asset.width,
      height: asset.height,
    };
  });
  return {
    candidateLabel: decision.snapshot.assessment.candidateLabel,
    targetEnvironment: releaseText(data, "targetEnvironment"),
    audience: releaseText(data, "audience", 1000),
    reviewedAt: decision.createdAt,
    decision: decision.decision,
    readiness: decision.snapshot.readiness.state,
    validUntil: decision.snapshot.readiness.validUntil,
    summary: releaseText(data, "summary", 2000),
    capabilities,
    images,
  };
}

export async function createReleaseShare(
  workspaceId: string,
  releaseId: string,
  decisionId: string,
  projection: PublicReleaseProjection,
  actor: ReleaseActor,
): Promise<ReleaseShareLink> {
  return inReleaseTransaction(async () => {
    const assessment = await lockAssessment(releaseId, workspaceId);
    await assertReleaseMember(workspaceId, actor, true);
    const row = await queryOne(
      `SELECT * FROM release_decisions WHERE id=$1 AND assessment_id=$2`,
      [decisionId, releaseId],
    );
    if (!row) throw new ReleaseError(404, "decision not found");
    const decision = releaseMap<ReleaseDecision>(row);
    const safe = safeReleaseProjection(projection, decision);
    for (const image of safe.images) {
      const assetRow = await queryOne(
        `SELECT * FROM release_assets WHERE id=$1 AND assessment_id=$2`,
        [image.assetId, releaseId],
      );
      if (!assetRow)
        throw new ReleaseError(400, "Retained publication asset not found");
      const asset = releaseMap<ReleaseAsset>(assetRow);
      const historical = decision.snapshot.assets.find(
        (candidate) => candidate.id === image.assetId,
      )!;
      if (
        asset.digest !== historical.digest ||
        asset.filename !== historical.filename
      )
        throw new ReleaseError(
          409,
          "Retained image no longer matches the recorded decision",
        );
      await readReleaseAssetBytes(asset);
    }
    const token = newShareToken();
    const createdAt = Date.now();
    await query(
      `INSERT INTO release_share_links(token,decision_id,projection,created_at) VALUES($1,$2,$3,$4)`,
      [token, decisionId, JSON.stringify(safe), createdAt],
    );
    await releaseAudit(
      workspaceId,
      assessment.boardId,
      actor,
      "release.share_create",
      "release_share_link",
      token,
      { assessmentId: releaseId, decisionId },
    );
    return { token, decisionId, projection: safe, createdAt, revokedAt: null };
  });
}

export async function revokeReleaseShare(
  workspaceId: string,
  token: string,
  actor: ReleaseActor,
): Promise<void> {
  return inReleaseTransaction(async () => {
    const row = await queryOne<{ assessment_id: string }>(
      `SELECT d.assessment_id FROM release_share_links s JOIN release_decisions d ON d.id=s.decision_id JOIN release_assessments r ON r.id=d.assessment_id JOIN boards b ON b.id=r.board_id WHERE s.token=$1 AND b.workspace_id=$2`,
      [token, workspaceId],
    );
    if (!row) throw new ReleaseError(404, "release share link not found");
    const assessment = await lockAssessment(row.assessment_id, workspaceId);
    await assertReleaseMember(workspaceId, actor, true);
    await query(
      `UPDATE release_share_links SET revoked_at=COALESCE(revoked_at,$2) WHERE token=$1`,
      [token, Date.now()],
    );
    await releaseAudit(
      workspaceId,
      assessment.boardId,
      actor,
      "release.share_revoke",
      "release_share_link",
      token,
      { assessmentId: assessment.id },
    );
  });
}

export async function getPublicReleaseShare(
  token: string,
): Promise<ReleaseShareLink | null> {
  const row = await queryOne(
    `SELECT * FROM release_share_links WHERE token=$1 AND revoked_at IS NULL`,
    [token],
  );
  return row ? releaseMap<ReleaseShareLink>(row) : null;
}
export async function getReleaseAsset(
  assetId: string,
  workspaceId: string,
): Promise<ReleaseAsset | null> {
  const row = await queryOne(
    `SELECT a.* FROM release_assets a JOIN release_assessments r ON r.id=a.assessment_id JOIN boards b ON b.id=r.board_id WHERE a.id=$1 AND b.workspace_id=$2`,
    [assetId, workspaceId],
  );
  return row ? releaseMap<ReleaseAsset>(row) : null;
}
export async function getPublicReleaseAsset(
  token: string,
  assetId: string,
): Promise<ReleaseAsset | null> {
  const row = await queryOne(
    `SELECT a.* FROM release_share_links s JOIN release_decisions d ON d.id=s.decision_id JOIN release_assets a ON a.assessment_id=d.assessment_id WHERE s.token=$1 AND s.revoked_at IS NULL AND a.id=$2 AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.projection->'images') image WHERE image->>'assetId'=a.id)`,
    [token, assetId],
  );
  return row ? releaseMap<ReleaseAsset>(row) : null;
}
export async function hasReleaseHistory(boardId: string): Promise<boolean> {
  return !!(await queryOne(
    `SELECT id FROM release_assessments WHERE board_id=$1 LIMIT 1`,
    [boardId],
  ));
}

// Compatibility wrappers: visual editor/REST/MCP use the same locks as release snapshots.
export async function updateBoard(
  ...args: Parameters<typeof updateBoardInternal>
): Promise<Board | null> {
  return withReleaseSourceLock(args[0], async () => {
    const result = await updateBoardInternal(...args);
    if (result) await bumpProductReviews(args[0]);
    return result;
  });
}
export async function deleteBoard(id: string): Promise<boolean> {
  return withReleaseSourceLock(id, async () => {
    if (await hasReleaseHistory(id))
      throw new ReleaseError(
        409,
        "This board has release history; archive its content instead of deleting it",
      );
    return deleteBoardInternal(id);
  });
}
export async function createScreen(
  ...args: Parameters<typeof createScreenInternal>
): Promise<Screen> {
  return withReleaseSourceLock(args[0].boardId, async () => {
    const result = await createScreenInternal(...args);
    await bumpProductReviews(args[0].boardId);
    return result;
  });
}
export async function reorderScreens(
  ...args: Parameters<typeof reorderScreensInternal>
): Promise<Screen[] | null> {
  return withReleaseSourceLock(args[0], async () => {
    const result = await reorderScreensInternal(...args);
    if (result) await bumpProductReviews(args[0]);
    return result;
  });
}
async function withScreenReview<T>(
  screenId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const screen = await getScreen(screenId);
  if (!screen) return operation();
  return withReleaseSourceLock(screen.boardId, async () => {
    const result = await operation();
    await bumpProductReviews(screen.boardId);
    return result;
  });
}
async function withRegionReview<T>(
  regionId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const region = await getRegion(regionId);
  if (!region) return operation();
  return withScreenReview(region.screenId, operation);
}
export async function updateScreen(
  ...args: Parameters<typeof updateScreenInternal>
): Promise<Screen | null> {
  return withScreenReview(args[0], () => updateScreenInternal(...args));
}
export async function updateScreenImage(
  ...args: Parameters<typeof updateScreenImageInternal>
): Promise<Screen | null> {
  return withScreenReview(args[0], () => updateScreenImageInternal(...args));
}
export async function deleteScreen(
  ...args: Parameters<typeof deleteScreenInternal>
): Promise<boolean> {
  return withScreenReview(args[0], () => deleteScreenInternal(...args));
}
export async function createRegion(
  ...args: Parameters<typeof createRegionInternal>
): Promise<Region> {
  return withScreenReview(args[0].screenId, () =>
    createRegionInternal(...args),
  );
}
export async function updateRegion(
  ...args: Parameters<typeof updateRegionInternal>
): Promise<Region | null> {
  return withRegionReview(args[0], () => updateRegionInternal(...args));
}
export async function deleteRegion(
  ...args: Parameters<typeof deleteRegionInternal>
): Promise<boolean> {
  return withRegionReview(args[0], () => deleteRegionInternal(...args));
}

/** Local retention tooling only; no HTTP endpoint exposes private filenames. */
export async function getRetainedReleaseAssetFilenames(): Promise<string[]> {
  return (
    await query<{ filename: string }>(
      `SELECT filename FROM release_assets ORDER BY filename`,
    )
  ).map((row) => row.filename);
}

async function inReleaseReadTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (releaseTransaction.getStore()) return operation();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result = await releaseTransaction.run(client, operation);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function readProductContext(
  boardId: string,
  workspaceId: string,
): Promise<ProductContext | null> {
  return inReleaseReadTransaction(() =>
    readProductContextInternal(boardId, workspaceId),
  );
}
export async function readReleaseDetail(
  releaseId: string,
  workspaceId: string,
): Promise<ReleaseDetail | null> {
  return inReleaseReadTransaction(() =>
    readReleaseDetailInternal(releaseId, workspaceId),
  );
}

async function memberOwnsReleaseRecords(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  return !!(await queryOne(
    `SELECT c.id FROM capabilities c JOIN boards b ON b.id=c.board_id WHERE b.workspace_id=$1 AND c.owner_user_id=$2 UNION ALL SELECT id FROM components WHERE workspace_id=$1 AND owner_user_id=$2 LIMIT 1`,
    [workspaceId, userId],
  ));
}
async function bumpWorkspaceProductReviews(workspaceId: string): Promise<void> {
  // Shared component ownership can affect any product dependency path. Conservatively
  // refresh all workspace reviews; matching check revisions/evidence remain untouched.
  const boards = await query<{ id: string }>(
    `SELECT id FROM boards WHERE workspace_id=$1 ORDER BY id FOR UPDATE`,
    [workspaceId],
  );
  for (const board of boards) await bumpProductReviews(board.id);
}
export async function addMember(
  input: Parameters<typeof addMemberInternal>[0],
): Promise<void> {
  return inReleaseTransaction(async () => {
    await lockReleaseWorkspace(input.workspaceId);
    const alreadyMember = await getMembership(input.workspaceId, input.userId);
    await addMemberInternal(input);
    if (
      !alreadyMember &&
      (await memberOwnsReleaseRecords(input.workspaceId, input.userId))
    )
      await bumpWorkspaceProductReviews(input.workspaceId);
  });
}
export async function updateMemberRole(
  input: Parameters<typeof updateMemberRoleInternal>[0],
): Promise<boolean> {
  return inReleaseTransaction(async () => {
    await lockReleaseWorkspace(input.workspaceId);
    return updateMemberRoleInternal(input);
  });
}
export async function removeMember(
  input: Parameters<typeof removeMemberInternal>[0],
): Promise<boolean> {
  return inReleaseTransaction(async () => {
    await lockReleaseWorkspace(input.workspaceId);
    const assigned = await memberOwnsReleaseRecords(
      input.workspaceId,
      input.userId,
    );
    const removed = await removeMemberInternal(input);
    if (removed && assigned)
      await bumpWorkspaceProductReviews(input.workspaceId);
    return removed;
  });
}

/** One snapshot feeds every role: scope, evidence, architecture and readiness cannot mix revisions. */
export async function readReleaseWorkspace(
  releaseId: string,
  workspaceId: string,
): Promise<ReleaseWorkspace | null> {
  return inReleaseReadTransaction(async () => {
    const detail = await readReleaseDetailInternal(releaseId, workspaceId);
    if (!detail) return null;
    const product = await readProductContextInternal(
      detail.assessment.boardId,
      workspaceId,
      false,
    );
    if (!product) return null;
    return {
      ...detail,
      product,
      readiness: evaluateRelease(detail, Date.now()),
    };
  });
}
