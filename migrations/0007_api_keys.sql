-- Long-lived API keys for non-interactive access (agents, scripts, CI).
--
-- OIDC covers humans in a browser; an agent or script can't complete an
-- interactive sign-in, so members mint keys bound to their own account.
-- Only a sha256 hash of the secret is stored — the plaintext is shown once
-- at creation and never again. `role` caps what the key may do; the
-- effective role at request time is the *lower* of this and the member's
-- current role, so demoting or removing a member instantly demotes or
-- kills their keys.
--
-- Mirrors share_links (soft revoke via revoked_at) with one difference:
-- user_id cascades on delete rather than SET NULL, because a key is a
-- credential of its user, not content that should outlive them.

CREATE TABLE api_keys (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    key_hash      TEXT NOT NULL UNIQUE,
    key_prefix    TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at    BIGINT NOT NULL,
    last_used_at  BIGINT,
    revoked_at    BIGINT
);

CREATE INDEX idx_api_keys_user ON api_keys(workspace_id, user_id);
