# CLAUDE.md: StateBoard

You are working in **StateBoard**, an open-source, self-hosted product for assessing release readiness. People inspect capabilities, their implementation dependencies, and the evidence that supports a release decision through views relevant to their work. Annotated screenshots remain the visual delivery view. Read [`README.md`](./README.md) for shipped functionality and the [release readiness MVP plan](./src/content/docs/release-readiness-mvp.mdx) for the adopted direction.

This file is the operating manual for working in this repo. Read it before you change anything substantive.

---

## The thesis

> The unit of assessment is a **product capability supported by evidence**, with optional visual anchors.
>
> Show what works, what it depends on, and why we believe it is ready for the intended users.

Protect these principles:

1. **Capabilities connect professions.** Describe a user or business outcome, such as exporting an invoice or reconciling transactions overnight. A capability can span several screens or have no UI. Keep `(screen, rectangle, state)` as its optional visual anchor; existing annotations remain valid.
2. **Readiness has a scope.** Assess an identified candidate for a target environment and audience, with an explicit validation environment and configuration. Evidence must identify the claim and version it verifies. A rendered screen, completed ticket, passing contract, or healthy service supports a limited claim; it does not establish the whole outcome.
3. **One assessment supports several views.** Product, frontend, backend, QA, operations/security/data, and release owners inspect the same records. Architecture explains implementation and impact. Only explicitly required checks determine readiness; connected components are not an implicit checklist.
4. **The review artifact stays simple.** A stakeholder should understand the release conclusion, blockers, and evidence gaps in 30 seconds, then drill down. Keep the share link useful. Public sharing is a curated server-produced projection; a view preset is never an authorization boundary.
5. **Decisions remain accountable.** Automated evidence informs calculated readiness. A named human records the decision against the reviewed revision. Preserve that assessment and its media; an edit timestamp or audit log alone is not verification or a reproducible release baseline.
6. **Self-hosted, airgap-ready, MIT.** No phone-home, analytics, license server, or required third-party runtime calls. Start with manual evidence and push ingestion through the existing authenticated REST API. Store evidence links without fetching them. Preserve the current exception for the configured internal OIDC provider.

StateBoard assesses the current product and release candidate. It does not manage epics, sprints, scheduling, ticket workflows, a complete organization-wide service catalog, or raw telemetry storage.

For product refinement, use a real bounded assessment and concrete tasks for several professions. Record observed confusion, make scoped changes, run the required gates, and repeat the tasks. Simulated personas and root-mediated browser retests are not human customer research. Pin a new candidate before recording verification of changed code; never copy a prior candidate's passing evidence. The [local iteration journal](./src/content/docs/persona-iteration.mdx) records the Codex-assisted StateBoard delivery case and its unresolved production/customer claims.

## Scope guardrails

The adopted sequence lives in [`src/content/docs/roadmap.mdx`](./src/content/docs/roadmap.mdx), rendered at `/docs/roadmap`. The concrete next-stage contract is [`src/content/docs/release-readiness-mvp.mdx`](./src/content/docs/release-readiness-mvp.mdx). Existing [GitHub milestones](https://github.com/saschb2b/stateboard/milestones) describe the earlier screenshot-led roadmap and need reconciliation; do not claim that their scope has already changed.

The latest published baseline remains **v1 (team-ready), `2026.8.0`**. **v2 (release readiness MVP) is implemented in this working tree and unreleased.** Capabilities, dependencies, assessments, checks, evidence, six views, decision snapshots, private retained media, and curated public sharing are available. Run migrations `0008`–`0010` on upgrade. The external team pilot and GitHub roadmap reconciliation remain follow-up work; later integrations and broader platform features stay outside this MVP.

The three visual delivery states remain **`shipped`, `mock`, and `missing`**, with their existing meanings and colors. `Shipped` means working in production, not ready in staging. Do not overload these labels with candidate readiness or runtime health. Custom visual states remain deferred and cannot replace the defaults.

The MVP uses separate check results (`pass`, `fail`, `inconclusive`) and calculated readiness (`ready`, `blocked`, `needs_evidence`). Every included capability needs a required functional acceptance check. A required failure blocks; absent, stale, inconclusive, or mismatched evidence cannot make an assessment ready. Optional checks remain visible without silently becoming gates. Empty scope is never ready. Approval requires calculated readiness and a current owner session; API keys may submit evidence but cannot record decisions. Gate waivers are outside the MVP.

Resolve implementation details against the MVP plan and the repo conventions below. Propose a deliberate plan change when a request exceeds that contract.

## UX principle: show, don't tell (applies to our own UI too)

The product's thesis is "show, don't tell." Our own interface has to honor it. **Empty states demonstrate the concept; they don't describe it.** If a user lands somewhere and asks "what is this for?", a paragraph of helper text won't fix it. A working example they can poke at will.

When you're filling in a screen, in this order, prefer:

1. **A permanent built-in example.** The app ships a fully-populated example board served from memory at `/share/demo` (source: `src/lib/demo-data.ts`). It is _not_ in the user's database. The readiness example at `/share/demo/releases` (`src/lib/release-demo.ts`) adds visual and nonvisual capabilities, dependencies, owners, and passing/failing/missing/stale evidence across the six views. Its clock is fixed to keep those examples stable. Never seed user-visible sample data, because the moment they delete it the reference is gone. From any empty state where a user might wonder "what is this?", link to the example with a small affordance like "View example ↗". The example is also the right thing for docs callouts and marketing CTAs to deep-link into.
2. **Concrete examples in placeholders.** "e.g. Acme Dashboard / Q2 2026" inside the input shows the pattern at the moment of typing, without an extra UI element.
3. **One-line subtitle stating the _grain_.** A board groups a product or product area; a release assessment evaluates one candidate for a named environment and audience. Existing boards do not need conversion before they can still be used visually.
4. **Tell the user what each field does + where it appears.** Helper text on a "Description" field shouldn't say "(optional)" alone. Say "Appears beneath the name on the share link." So the user knows what filling it in _does_, not just whether it's required.
5. **Anchor a creation moment as the start of a flow.** The visual flow remains "Upload a screenshot · Mark regions · Share the link." A readiness assessment follows "Choose candidate and capabilities · Attach verification · Review and record decision." Demonstrate each with a working example.

Avoid:

- **Seeding example content into the user's DB**, even with a "demo" flag. It pollutes the user's workspace, creates pressure to delete it, and the moment they do they lose the teaching reference. Keep the example in code (`demo-data.ts`), not in the user's data.
- **"Helpful" preset chips that don't reflect how users actually work.** Chips that pre-fill abstract event types ("Quarterly review", "Sprint review") don't help when real teams name boards by _product_ ("Acme Dashboard / Q2"). If a chip can't pre-fill something the user would have typed anyway, it's noise. Remove rather than keep.
- "What is a board?" / "What does this do?" sections in app chrome.
- Docs links as the **primary** affordance from an empty state. Docs are for "I want to go deeper", not "I'm stuck right now." (A subtle "Read the docs" link in a sidebar is fine; a giant card pointing to /docs from an empty state is not.)
- Marketing copy inside the app. That belongs on the landing page, not next to a workspace.

When in doubt, ask: _would I rather show this user one real example, or explain what this is?_ Always ship the example. Reviewers should reject changes that fail this test.

## Stack & conventions

- **Framework**: Next.js 16 App Router (`output: "standalone"`), with **Cache Components + Partial Prefetching enabled** (`cacheComponents: true`, `partialPrefetching: true` in `next.config.mjs`). Consequences: never add `export const dynamic` / `revalidate` / `fetchCache` route segment configs (they error); every route that reads request data or the DB needs a `loading.tsx` (or `<Suspense>`) shell above the access, or the build fails with a `blocking-prerender` error; caching is opt-in via `"use cache"` only. The Pages-export config branch keeps these flags off.
- **Next.js docs for agents**: version-matched Next.js docs ship inside the installed package at `node_modules/next/dist/docs/` (mirroring nextjs.org/docs). Read the relevant guide there before writing Next-specific code — Next 16.3 conventions (Cache Components, `use cache`, instant navigation) postdate most training data. The managed block in [`AGENTS.md`](./AGENTS.md) is written by `next dev`; when it updates, commit the change rather than stripping it from diffs.
- **UI**: React 19 + MUI 7 + Emotion in the marketing + product app (everything outside `/docs`). No Tailwind, no styled-components, no CSS modules in app code. Use MUI's `sx` prop and the theme in `src/lib/theme.ts`. The exception is `/docs`, which uses Fumadocs (Tailwind v4 internally) with its own scoped stylesheet at `src/app/docs/docs.css`. Don't import Tailwind utilities into `src/components/` or `src/app/(site)/`.
- **Persistence**: Postgres via `pg`, accessed from `src/lib/db.ts`. **All DB access goes through `src/lib/db.ts`**. Don't open new pools or run raw SQL outside it. Schema lives as plain SQL files under `migrations/`. Never inline `CREATE TABLE IF NOT EXISTS` in app code; add a numbered file and `scripts/migrate.mjs` applies it on the next `pnpm migrate` (the runner auto-discovers `migrations/*.sql`, so you don't edit it, and it never runs on app startup).
- **Auth**: Better Auth in `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (browser). OIDC-only, no email/password. Keycloak is the documented default but any OIDC provider works (the `genericOAuth` plugin doesn't care). Sessions are DB-backed in the same Postgres. Server components use `requirePageMember(role?)`; route handlers use `requireApiMember(role?)` from `src/lib/auth-helpers.ts`.
- **Workspaces**: single workspace per deployed instance (`id = 'default'`, minted on first sign-in). Boards belong to workspaces, never directly to users. When a member leaves, their content stays. The schema supports multiple workspaces per instance, but no UI to create them in v1.
- **File uploads**: Board images use `STATEBOARD_DATA_DIR/uploads` and the public `src/app/api/uploads/[filename]/route.ts` with its strict filename allowlist regex. Confidential release images and retained decision copies use `STATEBOARD_DATA_DIR/release-assets`, authenticated `/api/release-assets/[id]`, and token-scoped release publication routes. Preserve filename validation. Multi-replica deployments need a `ReadWriteMany` PVC.
- **Audit log**: every board / region / share-link / member mutation writes a row via `writeAudit({...})` from `db.ts`. Workspace audit UI and per-board history shipped in `2026.7.0`. Extend audit coverage to capabilities, dependencies, checks, evidence, release scope, decisions, and public projections. Audit records complement retained decision snapshots; they do not replace them.
- **No global state library**. React local state + server-fetched props are sufficient.
- **No external network calls** from server code, except to the configured OIDC provider (Keycloak). The product must work airgap-adjacent: the IdP is inside the same network as the app. Evidence producers push results to StateBoard; imported metadata and evidence references never cause automatic outbound requests.
- **TypeScript strict** (`noUncheckedIndexedAccess` is on). Don't loosen `tsconfig.json` to make a type error go away. Fix the call site.

### Coordinates are normalized

Region coordinates (`x`, `y`, `w`, `h`) are stored and transmitted as relative values in `[0, 1]`. **Never** store pixel coordinates. The whole point is that one screenshot renders correctly at any display size. Validate this on every API write.

### Readiness data boundaries

- Use boards as the product boundary and reuse capabilities across their assessments. Components may be reused within a workspace. Validate the workspace and board scope of every nested relationship, not just the outer resource ID.
- Keep assessment candidate/environment/audience/configuration immutable. A changed scope tuple creates another assessment. Version acceptance definitions; an earlier definition's evidence cannot verify its replacement.
- Evidence is append-only, attributed, and linked to the exact assessment and check revision. Choose the most recent matching observation deterministically; never prefer a pass or fall back to an older pass after a failure. Calculate freshness from verification time, not `board.updatedAt`.
- Keep dependencies explicit and bounded. Label the operation, event, job, or data required. Show declared relationships and potential impact without inventing observed runtime facts or inferring universal failure through the graph.
- Freeze decisions with their reviewed definitions, scope, selected evidence, evaluation time, and retained media. Coordinate snapshot creation with concurrent edits and image deletion; follow the MVP plan's revision and asset rules.
- Current `/api/uploads/[filename]` is public and cached, and image replacement removes old bytes. Private release assets use authenticated serving and token-scoped publication routes, with retained bytes verified against their digests. A public projection must exclude private fields from JSON, rendered HTML, metadata, and media responses.
- Profession-based views are presentation presets. Preserve `owner` / `editor` / `viewer` authorization. Human-only decisions need a session-only server guard because the existing owner API guard also accepts API keys.

### File layout

```
migrations/                                    Plain-SQL schema files, applied by scripts/migrate.mjs
scripts/
├── migrate.mjs                                Apply pending migrations
├── migrate-from-sqlite.mjs                    One-shot v0 → v1 importer
├── release-db.test.mjs                       Isolated-schema Postgres readiness tests
├── cleanup-release-assets.mjs                Local orphan-media cleanup (dry run by default)
└── pages-prebuild.mjs                         Strips runtime routes for the GH Pages export
src/
├── app/
│   ├── (site)/                                MUI-themed routes (root layout = ClientShell)
│   │   ├── page.tsx                           Landing
│   │   ├── boards/                            Board list + visual editor + [id]/releases workspaces
│   │   ├── share/                             Board tokens + releases/[token] + both memory examples
│   │   ├── settings/                          Members, API keys, workspace audit
│   │   ├── sign-in/                           Keycloak entry point
│   │   └── not-found.tsx
│   ├── docs/                                  Fumadocs (separate visual system, Tailwind v4)
│   │   ├── layout.tsx                         RootProvider + DocsLayout
│   │   ├── docs.css                           Tailwind + Fumadocs preset, scoped to /docs
│   │   └── [[...slug]]/page.tsx
│   ├── api/
│   │   ├── auth/[...all]/                     Better Auth catch-all
│   │   ├── boards/[id]/share-links/           Mint share tokens
│   │   ├── share-links/[token]/               Revoke
│   │   ├── workspace/members/                 List + per-user PATCH/DELETE
│   │   └── {boards,screens,regions,uploads,search}/   REST + search
│   ├── layout.tsx                             Minimal root: html + body + fonts
├── proxy.ts                                   Next 16 "proxy" auth gate (renamed from middleware)
├── components/                                React + MUI; client where needed. Sliced by domain,
│   │                                          currently sliced by board → screen → region:
│   ├── app/                                   Shell + chrome: client-shell, app-header, user-menu
│   ├── auth/                                  sign-in-panel
│   ├── board/                                 board-list, board-editor, board-settings, board-share,
│   │                                          present-mode, command-palette
│   ├── screen/                                screen-annotator, screen-sidebar, screen-uploader, add-screen-dialog
│   ├── region/                                region-overlay, state-chip (visual primitives)
│   ├── capability/                            Capability editing, scope, optional visual links
│   ├── dependency/                            Components, relationships, bounded impact views
│   ├── evidence/                              Check definitions, evidence entry and history
│   ├── release/                               Assessment context, views, decisions, curated sharing
│   ├── workspace/                             member-roster, api-key-* (manager + create-form + list + reveal), audit-log
│   └── site/                                  landing-mockup (marketing only)
├── content/docs/                              MDX docs source (do not import outside /docs)
└── lib/                                       db, paths, image, http, ids, auth, auth-client, auth-helpers, source (Fumadocs)
```

Server-only modules import `"server-only"` at the top so they fail loud if pulled into a client bundle. Keep that import on `db.ts`, `auth.ts`, `auth-helpers.ts`, and any future module that touches the filesystem or secrets.

The readiness MVP uses domain folders `release/`, `capability/`, `dependency/`, and `evidence/`. `src/lib/release-types.ts` defines the shared contracts; `readiness.ts` evaluates with an explicit clock; `release-projection.ts` constructs the public allowlist; `release-assets.ts` retains and verifies local media. Keep persistence and transactional revision/authorization checks in `db.ts`. Product editing is at `/boards/[id]/releases`, with assessments at `/boards/[id]/releases/[releaseId]` and curated public decisions at `/share/releases/[token]`. Board cards open the readiness workspace; Screens remains an explicit shortcut.

### Naming

- Files: `kebab-case.tsx` / `kebab-case.ts`.
- Components: `PascalCase` exports, named (no default exports for components). New components go in the matching domain folder under `src/components/` (see layout above); name them after what they _are_, not the page they appear on. A component whose file passes ~300 lines and does several jobs (form + list + panel) should be sliced into composed parts, like `workspace/api-key-*`.
- DB columns: `snake_case`. Mapped to `camelCase` at the boundary in `src/lib/db.ts`.
- API routes: REST nouns, plural (`/api/boards`, `/api/screens/:id/regions`). No RPC-style verbs.

### MUI theming

The theme is dark-first with a warm-orange accent matching the pitch deck identity. **Don't change the brand colors casually**. They're the same colors that appear in the deck and on chips/overlays. If you need a new accent, add a token to `src/lib/state-meta.ts` rather than overriding the theme.

`MuiPaper.elevation` is set to `0` with a 1px border. Keep that look. `MuiButton` uses `disableElevation: true` and `textTransform: "none"`. Match these defaults.

## Quality gates

Before committing or declaring a task done:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:stories
pnpm build
```

All six must pass. If `pnpm format:check` fails, run `pnpm format` to fix. If `pnpm lint` flags something, **fix the underlying issue**. Don't add `eslint-disable` to silence it unless the rule is genuinely wrong for this case. `pnpm test` runs the `node:test` suites (`src/**/*.test.ts`) on Node's built-in runner, with no test-framework dependency. `pnpm test:stories` renders every story in a real Chromium via Playwright and runs its `play` functions as interaction tests; it needs the browser binary once (`pnpm exec playwright install chromium`). Colocate a new unit test next to the module it covers, and prefer covering pure logic (validation, coordinate math, state mapping) over wiring that needs a live DB.

These same gates run in CI (`.github/workflows/ci.yml`) on every push and PR — story tests as their own `storybook · component tests` job, which caches the Playwright browser — plus Postgres-backed release integration tests in the app job and a Helm-chart job that lints the chart, server-side dry-runs the manifests, and re-asserts that `auth.secret` is required. A second workflow (`.github/workflows/docker.yml`) builds the container image on every PR and pushes to GHCR on `main` and on version tags. A third workflow (`.github/workflows/pages.yml`) deploys a read-only static demo (landing + docs + the visual and readiness examples) to GitHub Pages on every push to `main`. See "Pages demo" below. **Don't merge red CI**. If the workflow fails, fix the underlying issue rather than disabling the check.

### Pages demo

A static export of the marketing + docs + example-board surface is published at `https://saschb2b.github.io/stateboard/`. The editor, auth, and all DB-backed routes don't run there (no Node server on Pages). Build path:

1. `scripts/pages-prebuild.mjs` (gated by `PAGES_BUILD=1` so it can't ruin a local clone) deletes `src/app/api/`, `src/app/(site)/boards/[id]/`, `src/app/(site)/share/[token]/`, `src/app/(site)/share/releases/`, `src/app/(site)/sign-in/`, `src/app/(site)/settings/`, and `src/proxy.ts`. It then replaces `src/app/(site)/boards/page.tsx` with a stub pointing at the example + self-host instructions.
2. `STATEBOARD_PAGES=1 next build` switches `next.config.mjs` into `output: "export"` mode with `basePath`/`assetPrefix` set to the Pages base path.
3. `actions/upload-pages-artifact` + `actions/deploy-pages` push `out/` to Pages.

When you change anything in `src/app/(site)/boards`, `src/app/(site)/share`, `src/app/(site)/sign-in`, `src/app/(site)/settings`, or `src/app/api`, also think about whether the Pages stub still makes sense. It's the visitor's only signpost from those URLs.

For release persistence changes, run `STATEBOARD_INTEGRATION_DB_URL=postgres://… pnpm test:integration` against a disposable development/test Postgres; the suite creates and removes its own schema and media directory. Run `pnpm cleanup:release-assets` for a dry-run of orphan cleanup (`--delete` removes only unreferenced files older than 24 hours). Never remove a file referenced by a live assessment or recorded decision.

For UI changes, also run `pnpm dev` (against the docker-compose Postgres + Keycloak) and exercise the change in a browser. Type checks verify code, not features.

### Agent dev loop (Next.js runtime visibility)

The repo ships a project-scoped [`.mcp.json`](./.mcp.json) that starts `next-devtools-mcp`, which auto-discovers the running dev server via its built-in `/_next/mcp` endpoint. With `pnpm dev` running, use those tools instead of guessing from static code:

- **`get_errors`** — current build, runtime, and type errors, including browser-side errors forwarded to the terminal.
- **`get_compilation_issues`** / **`compile_route`** — check whether the project or one route compiles without running a full `pnpm build`.
- **`get_routes`** / **`get_page_metadata`** / **`get_project_metadata`** — the live route table and dev-server URL.

`next dev` writes its PID/port to `.next/dev/lock`; if a server is already running, connect to it rather than starting a second one. For a full inspect-edit-verify cycle (including browser-side verification via `agent-browser`), install the first-party skill — it's a per-developer install (`.claude/` and `skills-lock.json` are gitignored here):

```bash
npx skills add vercel/next.js --skill next-dev-loop
```

After a Cache Components validation error or insight, prefer the labeled fixes Next.js prints (`stream` / `cache` / `block`) and the per-error page it links under nextjs.org/docs/messages — they're written for agents.

### Component work happens in Storybook first

For component-level UI work, prefer the Storybook loop over the full app — no Postgres or Keycloak needed. `pnpm storybook` serves it at `localhost:6006`, and its MCP server (`@storybook/addon-mcp`, wired in `.mcp.json` at `http://localhost:6006/mcp`) gives you story URLs, story authoring guidance, and test hooks. Verify with `pnpm test:stories` — every story renders in a real Chromium via Playwright, and `play` functions run as interaction tests.

- Stories are colocated `*.stories.tsx` next to their component; the preview (`.storybook/preview.tsx`) already provides the MUI theme (dark-first) and App Router mocks — fix the preview, not individual stories, when many fail the same way.
- When you add or substantially change a component, add or update its story in the same change. Variant-only stories need no `play`; write one only when it proves an interaction, async arrival, or a computed style.
- Stories are prop-driven by design — no MSW, no network. Components whose buttons hit the real API (revoke, role change, sign-in) get render-only stories; note that in the story file's doc comment.
- Keep the demo board (`getDemoBoard()`) as the fixture for anything that renders screens + regions; it's the same example the app ships at `/share/demo`.

For Helm changes, run `helm dependency build deploy/helm/stateboard`, then `helm lint deploy/helm/stateboard --set auth.secret=test` and `helm template stateboard deploy/helm/stateboard --set auth.secret=test ... | kubectl apply --dry-run=client -f -`. The chart fails closed if `auth.secret` is empty. That's deliberate, don't disable it.

## API conventions

- All handlers use the helpers in `src/lib/http.ts` (`ok`, `created`, `noContent`, `badRequest`, `notFound`, `serverError`). Don't construct `NextResponse.json` manually. Keep the response shape consistent.
- Validation is inline at the top of each handler. We don't pull in zod for v0; the schemas are small enough that explicit checks are clearer. Don't add zod casually.
- Error responses are always `{ error: string }`. Successes return the resource directly.
- Use `await params` for dynamic segments (Next.js 16 App Router pattern).

## What not to build

Keep the release readiness MVP bounded:

- **Epics, sprints, ticket workflows, scheduling, or task assignment** → outside the product's assessment purpose.
- **A complete developer portal, telemetry backend, or graph editor** → later tools can supply references or imports; the MVP needs only dependencies relevant to assessed capabilities.
- **A weighted readiness score or ticket-driven auto-approval** → required claims determine readiness, and a human records the decision.
- **Gate waivers, configurable approval workflows, or a new profession-based permission system** → outside the MVP.
- **Jira/Linear/Slack SDKs, headless capture, scheduled recapture, and screenshot time-travel** → deferred backlog, not prerequisites for readiness.
- **Runtime polling of evidence URLs or third-party APIs** → conflicts with the self-hosted network contract.
- **Automatic capability discovery from source, endpoints, or traces** → later assistance must produce reviewed mappings, not asserted truth.
- **Real-time collab (yjs, websockets, presence)** → async review remains the use case.
- **An undo stack** → deferred.
- **A "rich" markdown notes field with an editor** → notes are plaintext.
- **Comment threads on regions** → out of scope. We are not Figma.
- **An invite/email flow** → not needed while OIDC handles identity. If a use-case forces it, surface the trade-off first.
- **Adding more OAuth providers in code** → Better Auth's `genericOAuth` already accepts any OIDC discovery URL. Document the env vars; don't add per-provider helpers casually.

## When you're stuck

- If a request exceeds the adopted assessment model or MVP, explain the scope trade-off against the roadmap and plan. Existing session authorization can approve a deliberate extension; do not reintroduce the retired screen-only restriction.
- If you need to add a dependency, prefer none. Then prefer one already in the lockfile. Then prefer something tiny and audit-able. Big runtime deps (`sharp`, `axios`, ORMs, etc.) require justification.
- If something on disk doesn't go through `db.ts` or `paths.ts`, that's a bug. File a fix before doing the change you came for.
