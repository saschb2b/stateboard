/**
 * Audit-log domain constants, types, and pure helpers.
 *
 * Deliberately free of `server-only`: the query layer (db.ts) and the API
 * routes run on the server, but the client audit-log UI also needs the action
 * list, labels, and formatting. Keeping the pure logic here lets it be
 * unit-tested without a live database and shared across both sides.
 */

/**
 * Every action `writeAudit` records. Kept as a single source of truth here
 * (db.ts imports the type) so the filter dropdown, the labels, and the writer
 * can't drift apart. Order is roughly resource-then-verb for a tidy dropdown.
 */
export const AUDIT_ACTIONS = [
  "board.create",
  "board.clone",
  "board.update",
  "board.delete",
  "screen.create",
  "screen.update",
  "screen.delete",
  "screen.reorder",
  "region.create",
  "region.update",
  "region.delete",
  "share_link.create",
  "share_link.revoke",
  "api_key.create",
  "api_key.revoke",
  "member.add",
  "member.remove",
  "member.role_change",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** The `target_type` values the writer uses, for the "resource" filter. */
export const AUDIT_TARGET_TYPES = [
  "board",
  "screen",
  "region",
  "share_link",
  "api_key",
  "user",
] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/** Human-readable label per action, for the table and the filter dropdown. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "board.create": "Created board",
  "board.clone": "Cloned board",
  "board.update": "Updated board",
  "board.delete": "Deleted board",
  "screen.create": "Added screen",
  "screen.update": "Updated screen",
  "screen.delete": "Deleted screen",
  "screen.reorder": "Reordered screens",
  "region.create": "Added region",
  "region.update": "Updated region",
  "region.delete": "Deleted region",
  "share_link.create": "Created share link",
  "share_link.revoke": "Revoked share link",
  "api_key.create": "Created API key",
  "api_key.revoke": "Revoked API key",
  "member.add": "Added member",
  "member.remove": "Removed member",
  "member.role_change": "Changed member role",
};

/** A friendly label for an action, falling back to the raw value if unknown. */
export function auditActionLabel(action: string): string {
  return (AUDIT_ACTION_LABELS as Record<string, string>)[action] ?? action;
}

/** One row of the audit log, mapped to the boundary shape in db.ts. */
export interface AuditEntry {
  id: number;
  actorId: string | null;
  /** Joined from the `user` table; null when the account was deleted. */
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  at: number;
}

/** Keyset cursor: the (at, id) of the last row on the previous page. */
export interface AuditCursor {
  at: number;
  id: number;
}

/** Validated, applied-to-SQL filter set. Absent fields mean "no constraint". */
export interface AuditFilters {
  actor?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  /** Inclusive lower bound in epoch ms. */
  fromMs?: number;
  /** Exclusive upper bound in epoch ms (start of the day after `to`). */
  toMs?: number;
  /**
   * Scope to a single board's events. Set by the board-history route, never
   * parsed from user query params — it's a hard access boundary, not a filter
   * the client can widen.
   */
  boardId?: string;
}

/**
 * Clamp a raw `limit` query param to a sane page size, falling back to `def`
 * when it's absent or unparseable. A non-positive value floors to 1.
 */
export function parseAuditLimit(
  raw: string | null,
  def = 50,
  max = 200,
): number {
  // Absent/empty falls back to the default. Guard it before Number(), which
  // maps null and "" to a finite 0 that would otherwise floor to 1.
  if (!raw) return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(max, Math.trunc(n)));
}

/**
 * Rebuild a keyset cursor from the `before` / `beforeId` params, or null.
 *
 * The empty/absent case is guarded first on purpose: `Number(null)` and
 * `Number("")` are both `0`, which would otherwise forge a `{ at: 0, id: 0 }`
 * cursor whose WHERE clause excludes every real row.
 */
export function parseAuditCursor(
  before: string | null,
  beforeId: string | null,
): AuditCursor | null {
  if (!before || !beforeId) return null;
  const at = Number(before);
  const id = Number(beforeId);
  if (!Number.isFinite(at) || !Number.isFinite(id)) return null;
  return { at, id };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/**
 * Parse and validate raw query params into an {@link AuditFilters}. Anything
 * malformed or unrecognized is dropped rather than rejected, so a stray param
 * can never widen access or break the query — it just doesn't filter. Dates
 * arrive as `YYYY-MM-DD` and are read as UTC days: `from` maps to that day's
 * start, `to` to the start of the following day (so the range is inclusive of
 * the whole `to` day).
 */
export function parseAuditFilters(
  input: Record<string, string | null | undefined>,
): AuditFilters {
  const filters: AuditFilters = {};

  const actor = input.actor?.trim();
  if (actor) filters.actor = actor;

  const action = input.action?.trim();
  if (action && (AUDIT_ACTIONS as readonly string[]).includes(action)) {
    filters.action = action as AuditAction;
  }

  const target = input.target?.trim();
  if (target && (AUDIT_TARGET_TYPES as readonly string[]).includes(target)) {
    filters.targetType = target as AuditTargetType;
  }

  const from = input.from?.trim();
  if (from && DATE_RE.test(from)) {
    const ms = Date.parse(from);
    if (Number.isFinite(ms)) filters.fromMs = ms;
  }

  const to = input.to?.trim();
  if (to && DATE_RE.test(to)) {
    const ms = Date.parse(to);
    if (Number.isFinite(ms)) filters.toMs = ms + DAY_MS;
  }

  return filters;
}

/**
 * A fixed UTC timestamp (`2026-07-09 09:57 UTC`) for the table. UTC keeps it
 * unambiguous for a compliance reader and, being identical on the server and
 * client, avoids a locale/timezone hydration mismatch.
 */
export function formatAuditTime(at: number): string {
  const iso = new Date(at).toISOString(); // 2026-07-09T09:57:58.123Z
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** A one-line `key=value · key=value` gloss of a row's meta, or "" if none. */
export function summarizeMeta(meta: Record<string, unknown> | null): string {
  if (!meta) return "";
  return Object.entries(meta)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ");
}

/** How many rows a single CSV export includes, most-recent first. */
export const AUDIT_EXPORT_CAP = 10_000;

const CSV_COLUMNS = [
  "at_utc",
  "actor_id",
  "actor_name",
  "action",
  "target_type",
  "target_id",
  "meta",
] as const;

/**
 * Encode one CSV cell. Two hazards handled:
 *  - RFC-4180 quoting: wrap in quotes and double any embedded quotes when the
 *    value contains a comma, quote, or newline.
 *  - Formula injection: a leading `= + - @`, tab, or CR makes Excel/Sheets
 *    evaluate the cell. Audit rows carry user-controlled text (board and member
 *    names), so we defang with a leading apostrophe before quoting.
 */
function csvCell(value: string): string {
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** One audit entry as a CSV record (no trailing newline). */
export function auditRowToCsv(entry: AuditEntry): string {
  return [
    new Date(entry.at).toISOString(),
    entry.actorId ?? "",
    entry.actorName ?? "",
    entry.action,
    entry.targetType,
    entry.targetId ?? "",
    entry.meta ? JSON.stringify(entry.meta) : "",
  ]
    .map(csvCell)
    .join(",");
}

/** Full CSV document (header + rows, CRLF-terminated) for a download. */
export function auditToCsv(entries: AuditEntry[]): string {
  const lines = [CSV_COLUMNS.join(","), ...entries.map(auditRowToCsv)];
  return lines.join("\r\n") + "\r\n";
}
