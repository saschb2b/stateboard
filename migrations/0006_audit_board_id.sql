-- Per-board scoping for the audit log.
--
-- Board / screen / region / share-link events all belong to some board, but a
-- raw row only records its immediate target (a screen or region id). Once that
-- screen or region is deleted, a board-scoped view can no longer trace the row
-- back to its board. So we denormalize the owning board id onto the row: the
-- writer sets it going forward (see writeAudit in src/lib/db.ts), and this
-- migration backfills existing rows as far as surviving relationships allow.
--
-- Workspace-level events (member.*) have no board and stay NULL — they surface
-- only in the owner-only /settings/audit view, never in a board's history.
--
-- Deliberately no foreign key: the audit log must outlive its targets, so a
-- deleted board must neither cascade-delete nor NULL these rows.

ALTER TABLE audit_log ADD COLUMN board_id TEXT;

CREATE INDEX idx_audit_board_at ON audit_log(board_id, at DESC);

-- board.* and screen.reorder target the board row directly.
UPDATE audit_log SET board_id = target_id
 WHERE board_id IS NULL AND target_type = 'board';

-- share_link.* and screen.create record the board id in meta.
UPDATE audit_log SET board_id = meta->>'boardId'
 WHERE board_id IS NULL AND meta ? 'boardId';

-- Surviving screens resolve to their board.
UPDATE audit_log a SET board_id = s.board_id
  FROM screens s
 WHERE a.board_id IS NULL AND a.target_type = 'screen' AND s.id = a.target_id;

-- Surviving regions resolve through their screen to a board.
UPDATE audit_log a SET board_id = s.board_id
  FROM regions r
  JOIN screens s ON s.id = r.screen_id
 WHERE a.board_id IS NULL AND a.target_type = 'region' AND r.id = a.target_id;

-- region.create records the screen id in meta; resolve that to a board.
UPDATE audit_log a SET board_id = s.board_id
  FROM screens s
 WHERE a.board_id IS NULL AND a.meta ? 'screenId' AND s.id = a.meta->>'screenId';
