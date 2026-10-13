---
type: Architecture
title: Persistence and media
description: Preserve scoped transactions, revision rules, evidence history, and retained image bytes.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T21:37:05Z
sources:
  - id: db
    resource: "src/lib/db.ts"
  - id: types
    resource: "src/lib/release-types.ts"
  - id: paths
    resource: "src/lib/paths.ts"
  - id: assets
    resource: "src/lib/release-assets.ts"
  - id: migrations
    resource: "migrations/"
  - id: migration-runner
    resource: "scripts/migrate.mjs"
  - id: cleanup
    resource: "scripts/cleanup-release-assets.mjs"
  - id: packaging
    resource: "scripts/standalone-artifact.mjs"
  - id: tracing
    resource: "scripts/standalone-policy.mjs"
---

All application database access goes through `src/lib/db.ts`. It owns the shared Postgres pool, SQL, row mapping, and transactions. Better Auth uses that pool. Map database `snake_case` to TypeScript `camelCase` at this boundary.[^db]

Schema changes use numbered SQL files in `migrations/`, applied explicitly by `pnpm migrate`. Application startup must not create or migrate schema. Do not add pools or SQL to route handlers.[^migration-runner]

Release writes use a shared lock order: workspace, board/source, then assessment. Nested queries use the active transaction. Product context, release workspace, and check history reads use a repeatable-read snapshot so one response cannot combine revisions.[^db]

| Change                             | Concurrency and history rule                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability definition              | Supply its current `definitionRevision`. Preserve assessment definitions until explicit adoption.                                           |
| Assessment scope, checks, evidence | Supply the current assessment revision. Reread after conflicts.                                                                             |
| Component or relationship update   | Shared transactions apply, but these edits do not have a universal optimistic revision token. Reconcile fresh context before changing them. |
| Check revision                     | Preserve earlier definitions and evidence. New evidence must match the active revision.                                                     |
| Evidence retry                     | An identical event and payload from the same source/credential returns the original observation. Changed data for that identity conflicts.  |
| Decision                           | Preserve reviewed definitions, relationships, evidence, evaluation, rationale, and selected image bytes.                                    |

Audit records commit with their mutations. Preserve the member and credential kind/ID for agent writes. Archive referenced catalog records. Boards with release history cannot pass ordinary board deletion.[^db]

## Media lifecycle

Resolve storage through `src/lib/paths.ts`. `STATEBOARD_DATA_DIR` defaults to `./data`. `uploads` holds legacy public images. `release-assets` holds authenticated release images and retained decision media.[^paths]

Preserve filename, MIME, size, and digest validation. Never remove bytes referenced by a live assessment or snapshot. Orphan cleanup defaults to a dry run and only deletes eligible unreferenced files with an explicit delete option.[^assets]

Back up Postgres and both image directories together. Multi-replica deployments require shared media storage. A successful local test does not prove production restore readiness.[^cleanup]

Deployment artifacts exclude local media, environment files, Git metadata, agent inputs, and the source knowledge bundle. `pnpm build` removes the environment files that Next copies into standalone output, then verifies every production file trace and the packaged files. Configure secrets and mount `STATEBOARD_DATA_DIR` at runtime; uploaded and retained media remain on that volume.[^packaging]

[Access](access.md) defines disclosure and live credential rules. [Verification](../engineering/verification.md) requires isolated database integration tests when these boundaries change.

[^db]: SQL, shared locking, snapshots, evidence identity, audit, and deletion behavior.

[^types]: Versioned product and release record fields.

[^paths]: Data directory resolution.

[^assets]: Private image validation and retention helpers.

[^migrations]: Numbered schema migrations.

[^migration-runner]: Explicit migration command.

[^cleanup]: Orphan cleanup procedure and age guard.

[^packaging]: Generated environment cleanup and read-only artifact verification.

[^tracing]: Exclusions for local inputs and configured storage inside or outside the repository.
