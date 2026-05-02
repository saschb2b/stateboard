-- Revocable share-link tokens.
--
-- v0 used the board slug as the share URL: /share/{slug}. v1 separates
-- the public read-only artifact from the board identifier so a leaked
-- link can be revoked without renaming the board, and so multiple links
-- per board are possible (e.g. one for execs, one for QA).
--
-- Tokens are public by design — anyone with the token can read the board
-- (preserving the no-login share-link thesis). Revocation is the only
-- way to take back access.

CREATE TABLE share_links (
    token       TEXT PRIMARY KEY,
    board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    label       TEXT,
    created_by  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at  BIGINT NOT NULL,
    revoked_at  BIGINT
);

CREATE INDEX idx_share_links_board ON share_links(board_id);
