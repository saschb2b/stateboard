-- Align the Better Auth tables with the column names the library actually
-- queries.
--
-- Better Auth (>= the 1.6.x line this repo pins) addresses its columns in
-- camelCase, case-sensitively — `"expiresAt"`, `"emailVerified"`, `"userId"`,
-- `"ipAddress"`, `"accessTokenExpiresAt"`, etc. (the schema `@better-auth/core`
-- defines in getAuthTables). Migration 0001 created them snake_case, so after
-- the better-auth bump every sign-in 500s with, e.g.:
--   column "expiresAt" of relation "verification" does not exist
--
-- 0001 says not to edit it in place and to add a follow-up migration when a
-- better-auth bump changes the expected schema — this is that migration.
-- RENAME COLUMN preserves data, indexes, and foreign keys, so it is safe on a
-- database that already applied 0001 as well as on a fresh one.
--
-- Only the four Better Auth tables change. The app's own tables (boards,
-- screens, regions, …) stay snake_case — db.ts owns and maps those, and it
-- only ever reads id/name/email/image off "user", none of which move here.
--
-- Identifiers are double-quoted so Postgres preserves the mixed case; unquoted
-- camelCase would be folded to lowercase and still not match the library.

ALTER TABLE "user" RENAME COLUMN email_verified TO "emailVerified";
ALTER TABLE "user" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "user" RENAME COLUMN updated_at TO "updatedAt";

ALTER TABLE "session" RENAME COLUMN expires_at TO "expiresAt";
ALTER TABLE "session" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "session" RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE "session" RENAME COLUMN ip_address TO "ipAddress";
ALTER TABLE "session" RENAME COLUMN user_agent TO "userAgent";
ALTER TABLE "session" RENAME COLUMN user_id TO "userId";

ALTER TABLE "account" RENAME COLUMN account_id TO "accountId";
ALTER TABLE "account" RENAME COLUMN provider_id TO "providerId";
ALTER TABLE "account" RENAME COLUMN user_id TO "userId";
ALTER TABLE "account" RENAME COLUMN access_token TO "accessToken";
ALTER TABLE "account" RENAME COLUMN refresh_token TO "refreshToken";
ALTER TABLE "account" RENAME COLUMN id_token TO "idToken";
ALTER TABLE "account" RENAME COLUMN access_token_expires_at TO "accessTokenExpiresAt";
ALTER TABLE "account" RENAME COLUMN refresh_token_expires_at TO "refreshTokenExpiresAt";
ALTER TABLE "account" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "account" RENAME COLUMN updated_at TO "updatedAt";

ALTER TABLE "verification" RENAME COLUMN expires_at TO "expiresAt";
ALTER TABLE "verification" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "verification" RENAME COLUMN updated_at TO "updatedAt";
