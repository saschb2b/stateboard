# Working on StateBoard

This is the canonical operating manual for coding agents in this repository. `CLAUDE.md` imports it for Claude-compatible clients. The installable [`skills/stateboard/SKILL.md`](./skills/stateboard/SKILL.md) serves a different purpose: it teaches agents working on other products to maintain their team's StateBoard instance.

StateBoard answers **what works, what it depends on, and why it is ready to release**. Capabilities, declared dependencies, versioned checks, and evidence connect the people involved. Screenshots are an optional visual view. External coding agents and CI keep the records current; people review intent, unresolved claims, and release decisions.

## Work loop

1. **Understand the change.** Read the request, current Git status, relevant implementation/tests, and the applicable documentation below. Reuse the active task branch; create a `codex/` branch when a new branch is needed. Preserve unrelated work. Inspect available local services before starting another server.
2. **Implement a bounded slice.** Choose a concrete outcome and work through it without stopping at a plan. Use independent agents for separable work with explicit file ownership. Resolve routine implementation choices from the repository and task context; ask only when a materially missing fact or action outside the authorized scope prevents a sound choice.
3. **Verify behavior.** Run focused checks while iterating, then the six gates before committing or reporting completion. Exercise changed UI in the real app and narrow panels as well as component stories. Inspect failures and fix their cause; do not replace a failing check with a suppression.
4. **Maintain the assessment when connected.** If the task includes StateBoard upkeep and a board/credential is configured, reconcile the affected capabilities, mappings, and checks through REST/MCP using the packaged skill. Reuse IDs and report actual observations for the exact candidate tested. Missing credentials do not block independent code work; report the maintenance step that could not run. Never put fabricated data into the user's board to fill a gap.
5. **Commit and report.** Make small, coherent commits on the task branch, with passing verification for the committed state. Review the diff and repository status. Report the outcome, relevant tests, remaining uncertainty, and assessment/artifact links. A plan, a simulated persona, or a successful tool call alone is not completion.

An instruction to implement or maintain the product authorizes routine edits and verification within that scope; do not ask for approval of every field. It does not authorize unrelated publication, messaging, deployment, destructive data cleanup, or changes to real release decisions. Follow the user's existing authorization and continue useful work when one dependent step is blocked.

## Truth and product boundaries

- A capability is a user or business outcome, including work with no UI. Components describe implementation references; dependencies explain required operations, events, jobs, or data. Source inspection can ground declared mappings, with concise source references. It cannot establish observed runtime behavior or passing acceptance evidence.
- An assessment identifies an immutable candidate plus validation environment, target environment, audience, and configuration. Changing that tuple creates another assessment. Evidence confirms the exact candidate, expected environment, active check revision, and context actually tested. Never copy an old pass to a new candidate.
- Every included capability needs a required functional acceptance check. Required failures block. Missing, expired, inconclusive, or mismatched evidence cannot establish ready. Empty scope is not ready. Optional checks and declared graph edges do not silently become gates; removing a failed requirement to make the board green is not verification.
- Evidence is append-only, attributed, and idempotent by event identity. Select the latest matching observation deterministically, not the most favorable result. Compute freshness from verification time. Preserve prior definitions and history; archive referenced records rather than destroying them.
- Visual `shipped` means working in production for the intended users. `mock` means faked/stubbed; `missing` means not built. Local or staging readiness does not change these meanings. Region rectangles use normalized `[0, 1]` coordinates, never pixels.
- A current human owner records approval/hold and publishes/revokes curated release reviews through a browser session. API keys cannot do this, even if owner-scoped. Approval also requires calculated readiness and the reviewed revision. Simulated personas cannot supply independent human review or production evidence.

The [MVP contract](./src/content/docs/release-readiness-mvp.mdx) defines invariants and acceptance cases. The [roadmap](./src/content/docs/roadmap.mdx) records adopted scope, and the [README](./README.md) distinguishes the published baseline from unreleased work. Do not duplicate release history in this manual.

## Implementation boundaries

**Persistence and access**

- All application DB access goes through `src/lib/db.ts`; no additional pools or raw SQL elsewhere in app code. Use numbered SQL migrations in `migrations/`, applied explicitly by `pnpm migrate`; no inline schema creation or migration on server startup. Map DB `snake_case` to TypeScript `camelCase` at this boundary.
- Scope every resource and nested relationship to the authenticated workspace and correct board. Reuse existing `owner` / `editor` / `viewer` authorization. Profession views are presentation presets, never permission boundaries.
- Preserve shared locking/revision rules for product mappings, checks, scope, evidence, decisions, and retained media. Revalidate membership and credentials in mutation transactions. Audit mutations with their data changes; source/credential attribution must survive REST and MCP.
- Ordinary REST and MCP maintenance must enforce the same validation, roles, scope, revision conflicts, and evidence retry rules. Structured tool results should let agents continue from current context. Keep secret tokens/hashes out of results and audit metadata.
- Use `requirePageMember` / `requireApiMember` for ordinary access, and the session-only owner guard for decisions/publication. New cookie-authenticated mutations require matching-origin checks. Keep `server-only` on filesystem, database, auth, and secret-bearing modules.

**Runtime and files**

- Self-hosted, airgap-ready, MIT. Server code makes no outbound calls except to the configured internal OIDC provider. Evidence producers push results; evidence/reference URLs are stored, never fetched by StateBoard.
- External agents may derive and maintain repository-grounded context and run authorized tests in their own environment. Do not add server-hosted LLMs, test execution, repository polling, or a scheduler to accomplish ordinary upkeep.
- Resolve application storage through `src/lib/paths.ts`. Legacy board images in `uploads` are public and cached; confidential release images and retained decision media live in `release-assets`. Preserve filename/MIME validation and digest checks. Never remove bytes referenced by a live assessment or snapshot.
- Public release output is an immutable server-built allowlist tied to a recorded decision. Protect JSON, HTML, metadata, and token-scoped media; hiding a private field in the UI is insufficient. Visual board sharing does not publish private release assessments.

**Next.js and TypeScript**

- Next.js 16 App Router, React 19, strict TypeScript with `noUncheckedIndexedAccess`. Fix types at the call site; do not weaken compiler settings.
- Read the version-matched local Next.js guide before Next-specific changes. `next.config.mjs` enables Cache Components and partial prefetching: request/DB-backed pages need a loading/Suspense shell, caching is opt-in with `"use cache"`, and `dynamic` / `revalidate` / `fetchCache` segment settings are incompatible. Await dynamic `params`.
- Use existing HTTP helpers from `src/lib/http.ts`. REST successes return resources directly and errors use `{ error: string }`; keep explicit boundary validation and payload limits. Prefer existing dependencies; justify a new runtime dependency rather than adding it for convenience.
- Use kebab-case files, named PascalCase component exports, and plural REST resource routes. Compose domain components under `src/components/{capability,dependency,evidence,release,...}`. Split files doing several jobs rather than adding more state to a monolith.

## UI work

The interface must make the release conclusion, blockers, and missing evidence understandable quickly. Keep the reading surface small: navigation before details, compact rows, disclosure for evidence/context, and clear routes between capability, implementation, and checks. Avoid repeated summary cards, helper paragraphs, and disabled controls. Use the existing real-project tasks to find confusion; [the iteration journal](./src/content/docs/persona-iteration.mdx) records findings and limits. Simulated persona reviews are not human customer research.

Use React + MUI 7 + Emotion in the app. All UI colors come from `src/lib/theme.ts` / `state-meta.ts` and theme tokens; preserve the existing dark-first brand and flat bordered Paper treatment. No Tailwind, styled-components, or CSS modules in app components. `/docs` alone uses Fumadocs and its scoped Tailwind stylesheet. Local React state and server-fetched props are sufficient.

Work on components through Storybook first where useful. Add/update colocated `*.stories.tsx` with substantial component changes; stories stay prop-driven with no network mutations. Use `play` only to prove meaningful interaction, async behavior, or styling. Shared theme/router mocks belong in `.storybook/preview.tsx`. Use the shipped in-memory examples as fixtures; never seed sample data into a user's database. Empty states should link to `/share/demo` or `/share/demo/releases` and demonstrate the concept with minimal copy.

## Verification and local tooling

The source of truth for commands is [`package.json`](./package.json), with CI in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). Before committing or declaring completion, all six gates must pass:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:stories
pnpm build
```

Fix formatting on changed files without rewriting unrelated work. Tests should prove observable behavior and meaningful boundaries, not mirror implementation wording. Unit tests use Node's runner; stories render in Chromium. Install the browser with `pnpm exec playwright install chromium` if absent. Do not claim skipped or unrun tests passed.

Run additional checks when their boundaries change:

| Change                                                                                | Verification                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Release persistence, authorization, REST/MCP adapters, revisions, evidence, or assets | `STATEBOARD_INTEGRATION_DB_URL=postgres://… pnpm test:integration` against development/test Postgres. The release and MCP suites create/remove their own schemas and media directories. Never reset the application schema or test against production. |
| UI or navigation                                                                      | Real browser flow against Postgres/OIDC, including narrow panels and applicable authenticated/public paths; component stories alone are insufficient.                                                                                                  |
| Runtime routes, docs, examples, or static-export behavior                             | Check the Pages surface. Run `PAGES_BUILD=1 pnpm build:pages` only in a disposable checkout/CI: its preparation deletes/replaces runtime source files.                                                                                                 |
| Helm/deployment chart                                                                 | Follow the Helm job in CI: dependency build, lint, template validation with kubeconform, multi-replica rendering, and missing-secret rejection. Do not weaken fail-closed secrets to pass rendering.                                                   |
| Packaged StateBoard skill                                                             | Validate its frontmatter and exercise a realistic setup/update task against the tool contract; unchanged instructions alone do not prove an agent workflow works.                                                                                      |

For local startup, follow the [README quick start](./README.md#quick-start-local-dev): `.env.example`, Docker Compose Postgres/Keycloak, install, migrate, and `pnpm dev`. Reuse an existing server discovered through `.next/dev/lock` or the runtime tools rather than starting a duplicate. Keep credentials and machine-specific connection settings out of committed files.

[`.mcp.json`](./.mcp.json) configures **development tools**, not a credentialed connection to the product's StateBoard MCP server: Next devtools discovers the live server; Storybook MCP uses `http://localhost:6006/mcp` when `pnpm storybook` is running. Discover their current capabilities before calling them. Use runtime diagnostics alongside tests rather than inferring successful behavior from source alone. These tools are optional aids, not extra product runtime dependencies.

## Scope

This product assesses and shares product/release state. It is not a ticket/sprint tracker, full developer portal or telemetry store, test runner, deployment controller, automatic release approver, or configurable waiver engine. Provider connectors, scheduled capture, broader catalog imports, and portfolio views follow the roadmap. External AI maintenance through the existing product model is in scope now. A user may authorize a deliberate scope extension; apply that request without resurrecting an obsolete restriction.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
