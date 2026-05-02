-- Better Auth's required tables (user / session / account / verification).
--
-- Schema mirrors `npx @better-auth/cli generate` for Postgres so the
-- library's built-in queries work without any custom adapter wiring. We
-- own the SQL rather than letting the library emit it at runtime so the
-- shape is auditable and reviewable in a normal PR.
--
-- If you bump better-auth and the CLI starts producing a different schema,
-- add a follow-up migration — never edit this file in place.

CREATE TABLE "user" (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    image           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "session" (
    id          TEXT PRIMARY KEY,
    expires_at  TIMESTAMPTZ NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address  TEXT,
    user_agent  TEXT,
    user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX session_user_id_idx ON "session"(user_id);

CREATE TABLE "account" (
    id                       TEXT PRIMARY KEY,
    account_id               TEXT NOT NULL,
    provider_id              TEXT NOT NULL,
    user_id                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    access_token             TEXT,
    refresh_token            TEXT,
    id_token                 TEXT,
    access_token_expires_at  TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope                    TEXT,
    password                 TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX account_user_id_idx ON "account"(user_id);

CREATE TABLE "verification" (
    id          TEXT PRIMARY KEY,
    identifier  TEXT NOT NULL,
    value       TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX verification_identifier_idx ON "verification"(identifier);
