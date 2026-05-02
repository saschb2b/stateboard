-- StateBoard v1 application schema (the part that's not auth).
--
-- One workspace per deployed instance — the chart mints `id = 'default'`
-- on first startup. We still use a workspace_id FK on every board so the
-- two-tenant variant in v2+ can be added without a data migration:
-- "single-tenant" is just "exactly one row in workspaces".
--
-- Boards belong to a workspace, screens belong to a board, regions belong
-- to a screen. Cascade deletes downward; user references go to SET NULL
-- so removing a member doesn't blow away their content history.

CREATE TABLE workspaces (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  BIGINT NOT NULL
);

-- Membership ties a Better Auth user to the workspace and carries their role.
-- Roles: 'owner' (manage members + delete workspace), 'editor' (CRUD boards),
-- 'viewer' (read-only inside the app — share links remain public regardless).
CREATE TABLE workspace_members (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role         TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at   BIGINT NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

CREATE TABLE boards (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT,
    created_by   TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    updated_by   TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE INDEX idx_boards_workspace ON boards(workspace_id, updated_at DESC);

CREATE TABLE screens (
    id         TEXT PRIMARY KEY,
    board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    mime_type  TEXT NOT NULL,
    width      INTEGER NOT NULL,
    height     INTEGER NOT NULL,
    label      TEXT,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_screens_board ON screens(board_id, position);

-- Region coordinates are normalized to [0, 1]. The CHECK enforces it at
-- the DB boundary so a buggy or malicious client can't poison the table.
CREATE TABLE regions (
    id         TEXT PRIMARY KEY,
    screen_id  TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    x          REAL NOT NULL CHECK (x >= 0 AND x <= 1),
    y          REAL NOT NULL CHECK (y >= 0 AND y <= 1),
    w          REAL NOT NULL CHECK (w > 0 AND w <= 1),
    h          REAL NOT NULL CHECK (h > 0 AND h <= 1),
    state      TEXT NOT NULL CHECK (state IN ('shipped', 'mock', 'missing')),
    label      TEXT,
    notes      TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    updated_by TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE INDEX idx_regions_screen ON regions(screen_id);
