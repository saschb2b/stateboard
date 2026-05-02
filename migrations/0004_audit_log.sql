-- Append-only audit log for sensitive mutations.
--
-- Rows are written on board/region create/update/delete and on share-link
-- grants/revocations. UI surfacing of this table is deliberately minimal
-- in v1 (just an "updated by" pill on regions); the rows exist primarily
-- so a security-conscious operator can answer "who did what" by reading
-- the table directly, even before we build a UI for it.

CREATE TABLE audit_log (
    id            BIGSERIAL PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    action        TEXT NOT NULL,
    target_type   TEXT NOT NULL,
    target_id     TEXT,
    meta          JSONB,
    at            BIGINT NOT NULL
);

CREATE INDEX idx_audit_workspace_at ON audit_log(workspace_id, at DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id);
