# CLAUDE.md — StateBoard

You are working in **StateBoard**, an open-source self-hosted tool for visual status reporting. Stakeholders look at screenshots of a product with green/yellow/red badges painted on regions. Read [`README.md`](./README.md) and the founder pitch in `StateBoard_Pitch.pdf` for the full thesis.

This file is the operating manual for working in this repo. Read it before you change anything substantive.

---

## The thesis (don't dilute it)

> The unit of truth is the **screen region**, not the ticket.
>
> A status report for a visual product should look like the product — annotated.

Three things follow from this and you must protect them:

1. **The primitive is `(screen, rectangle, state)`**. Nothing more. Don't introduce epics, swimlanes, sprints, or anything that smells like a roadmap tool. Roadmap incumbents already own that surface area; if we drift toward it we lose.
2. **The artifact is the share link**. The editor exists to produce a thing an exec can read in 30 seconds without a login. Every change must be evaluated against "does this make the share link better, or does it just add knobs for the editor?"
3. **Self-hosted, airgap-ready, MIT**. No phone-home, no analytics, no license server, no `fetch` to a third-party domain at runtime. If you're tempted to add one, stop and ask. The teams who need this most (defense, health, finance, gov) can't use a SaaS — that's the whole distribution thesis.

## Scope guardrails (v0)

The current stage is **v0 — the wedge**. The build plan in the pitch deck is staged. **Do not implement v1+ features in v0** unless explicitly asked. The full staging:

- **v0**: manual upload, region tagging, three states (`shipped` / `mock` / `missing`), share link, single user, no auth.
- **v1**: multi-user + OIDC, headless capture from URL, Jira issue linking, custom states, public GitHub release.
- **v2**: scheduled re-capture, time-travel / diff view, two-way Jira sync, Slack notifications, Notion/Confluence embed.
- **v3**: auto region-detection (DOM), journey-level views, portfolio rollup, SSO, audit log, template gallery.

If the user asks for something that smells like v1+ work (auth, capture-from-URL, Jira, Slack, multi-user), confirm before building. Cite the stage it belongs to.

The three v0 states are **load-bearing**. Don't add a fourth state, don't rename them, don't make them configurable, don't soften "missing" to "planned". Their force comes from being three blunt categories that match how stakeholders actually think.

## UX principle: show, don't tell — applies to our own UI too

The product's thesis is "show, don't tell." Our own interface has to honor it. **Empty states demonstrate the concept; they don't describe it.** If a user lands somewhere and asks "what is this for?", a paragraph of helper text won't fix it — a working example they can poke at will.

When you're filling in a screen, in this order, prefer:

1. **A permanent built-in example.** The app ships a fully-populated example board served from memory at `/v/demo` (source: `src/lib/demo-data.ts`). It is _not_ in the user's database — never seed user-visible sample data, because the moment they delete it the reference is gone. From any empty state where a user might wonder "what is this?", link to the example with a small affordance like "View example ↗". The example is also the right thing for docs callouts and marketing CTAs to deep-link into.
2. **Concrete examples in placeholders.** "e.g. Acme Dashboard / Q2 2026" inside the input shows the pattern at the moment of typing, without an extra UI element.
3. **One-line subtitle stating the _grain_.** "One board per product or per quarterly review. Most teams keep 3–8." That answers "how many do I need?" without lecturing.
4. **Tell the user what each field does + where it appears.** Helper text on a "Description" field shouldn't say "(optional)" alone — say "Appears beneath the name on the share link." So the user knows what filling it in _does_, not just whether it's required.
5. **Anchor a creation moment as the start of a flow.** A small `1 → 2 → 3` preview ("Upload a screenshot · Mark regions · Share the link") inside a New-X dialog tells the user the journey before they commit.

Avoid:

- **Seeding example content into the user's DB**, even with a "demo" flag. It pollutes the user's workspace, creates pressure to delete it, and the moment they do they lose the teaching reference. Keep the example in code (`demo-data.ts`), not in the user's data.
- **"Helpful" preset chips that don't reflect how users actually work.** Chips that pre-fill abstract event types ("Quarterly review", "Sprint review") don't help when real teams name boards by _product_ ("Acme Dashboard / Q2"). If a chip can't pre-fill something the user would have typed anyway, it's noise. Remove rather than keep.
- "What is a board?" / "What does this do?" sections in app chrome.
- Docs links as the **primary** affordance from an empty state. Docs are for "I want to go deeper", not "I'm stuck right now." (A subtle "Read the docs" link in a sidebar is fine; a giant card pointing to /docs from an empty state is not.)
- Marketing copy inside the app — that belongs on the landing page, not next to a workspace.

When in doubt, ask: _would I rather show this user one real example, or explain what this is?_ Always ship the example. Reviewers should reject changes that fail this test.

## Stack & conventions

- **Framework**: Next.js 16 App Router (`output: "standalone"`).
- **UI**: React 19 + MUI 7 + Emotion in the marketing + product app (everything outside `/docs`). No Tailwind, no styled-components, no CSS modules in app code — use MUI's `sx` prop and the theme in `src/lib/theme.ts`. The exception is `/docs`, which uses Fumadocs (Tailwind v4 internally) with its own scoped stylesheet at `src/app/docs/docs.css`. Don't import Tailwind utilities into `src/components/` or `src/app/(site)/`.
- **Persistence**: SQLite via `better-sqlite3`, accessed from `src/lib/db.ts`. **All disk access goes through `src/lib/db.ts` and `src/lib/paths.ts`**. Don't open new file handles or new sqlite connections elsewhere.
- **File uploads**: Local filesystem under `STATEBOARD_DATA_DIR/uploads`. Served by `src/app/api/uploads/[filename]/route.ts` with a strict filename allowlist regex — preserve that regex when touching the route.
- **No global state library**. React local state + server-fetched props are sufficient for v0.
- **No external network calls** from server code. The product must work in an airgapped environment. If you need a library that pings home, find another one.
- **TypeScript strict** (`noUncheckedIndexedAccess` is on). Don't loosen `tsconfig.json` to make a type error go away — fix the call site.

### Coordinates are normalized

Region coordinates (`x`, `y`, `w`, `h`) are stored and transmitted as relative values in `[0, 1]`. **Never** store pixel coordinates. The whole point is that one screenshot renders correctly at any display size. Validate this on every API write.

### File layout

```
src/
├── app/
│   ├── (site)/                                MUI-themed routes (root layout = ClientShell)
│   │   ├── page.tsx                           Landing
│   │   ├── boards/                            Board list (page.tsx) + editor ([id]/page.tsx)
│   │   ├── share/                             Public read-only share ([slug]/) + /share/demo
│   │   └── not-found.tsx
│   ├── docs/                                  Fumadocs (separate visual system, Tailwind v4)
│   │   ├── layout.tsx                         RootProvider + DocsLayout
│   │   ├── docs.css                           Tailwind + Fumadocs preset, scoped to /docs
│   │   └── [[...slug]]/page.tsx
│   ├── api/{boards,screens,regions,uploads,search}   REST + search handlers
│   └── layout.tsx                             Minimal root: html + body + fonts
├── components/                                React + MUI; client where needed
├── content/docs/                              MDX docs source (do not import outside /docs)
└── lib/                                       db, paths, image, http, ids, source (Fumadocs)
```

Server-only modules import `"server-only"` at the top so they fail loud if pulled into a client bundle. Keep that import on `db.ts` and any future module that touches the filesystem or secrets.

### Naming

- Files: `kebab-case.tsx` / `kebab-case.ts`.
- Components: `PascalCase` exports, named (no default exports for components).
- DB columns: `snake_case`. Mapped to `camelCase` at the boundary in `src/lib/db.ts`.
- API routes: REST nouns, plural — `/api/boards`, `/api/screens/:id/regions`. No RPC-style verbs.

### MUI theming

The theme is dark-first with a warm-orange accent matching the pitch deck identity. **Don't change the brand colors casually** — they're the same colors that appear in the deck and on chips/overlays. If you need a new accent, add a token to `src/lib/state-meta.ts` rather than overriding the theme.

`MuiPaper.elevation` is set to `0` with a 1px border — keep that look. `MuiButton` uses `disableElevation: true` and `textTransform: "none"`. Match these defaults.

## Quality gates

Before committing or declaring a task done:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

All four must pass. If `pnpm format:check` fails, run `pnpm format` to fix. If `pnpm lint` flags something, **fix the underlying issue** — don't add `eslint-disable` to silence it unless the rule is genuinely wrong for this case.

These same gates run in CI (`.github/workflows/ci.yml`) on every push and PR, plus a Helm-chart job that lints the chart, server-side dry-runs the manifests, and re-asserts the `replicaCount > 1` guardrail. A second workflow (`.github/workflows/docker.yml`) builds the container image on every PR and pushes to GHCR on `main` and on version tags. **Don't merge red CI** — if the workflow fails, fix the underlying issue rather than disabling the check.

For UI changes, also run `pnpm dev` and exercise the change in a browser. Type checks verify code, not features.

For Helm changes, run `helm lint deploy/helm/stateboard` and `helm template stateboard deploy/helm/stateboard | kubectl apply --dry-run=client -f -`. The chart is hard-pinned to a single replica until v1 introduces Postgres — keep the `fail`-on-`replicaCount > 1` guardrail in `templates/deployment.yaml`. SQLite + `ReadWriteOnce` + `RollingUpdate` corrupts the DB; that's why `strategy.type: Recreate` is the default and shouldn't be changed.

## API conventions

- All handlers use the helpers in `src/lib/http.ts` (`ok`, `created`, `noContent`, `badRequest`, `notFound`, `serverError`). Don't construct `NextResponse.json` manually — keep the response shape consistent.
- Validation is inline at the top of each handler. We don't pull in zod for v0; the schemas are small enough that explicit checks are clearer. Don't add zod casually.
- Error responses are always `{ error: string }`. Successes return the resource directly.
- Use `await params` for dynamic segments (Next.js 16 App Router pattern).

## What not to build

These are tempting and wrong for the current stage:

- **Auth, accounts, teams, sharing permissions** → v1.
- **Pulling in a Jira/Linear/Slack SDK** → v1/v2.
- **Headless screenshot capture (Playwright, Puppeteer)** → v1.
- **Real-time collab (yjs, websockets, presence)** → never, probably. The use case is asynchronous review.
- **An undo stack, version history, or audit log** → v2/v3.
- **A "rich" markdown notes field with an editor** → notes are plaintext for v0.
- **Comment threads on regions** → out of scope. We are not Figma.
- **A region search / filter UI** → maybe v3 once portfolios exist.
- **DB migrations beyond the inline `CREATE TABLE IF NOT EXISTS`** → v0 schema is small. When v1 needs migrations, introduce them deliberately, not opportunistically.

## When you're stuck

- If a request feels like it's about to violate the thesis above, surface that explicitly. The right answer is often "let's not."
- If you need to add a dependency, prefer none. Then prefer one already in the lockfile. Then prefer something tiny and audit-able. Big runtime deps (`sharp`, `axios`, ORMs, etc.) require justification.
- If something on disk doesn't go through `db.ts` or `paths.ts`, that's a bug — file a fix before doing the change you came for.
