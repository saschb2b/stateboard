# Changelog

All notable changes to StateBoard are documented here.

Versions follow [CalVer](https://calver.org/): `YYYY.M.PATCH`. A new minor cuts whenever a release ships; patches fix issues against a released minor.

## 2026.8.0

Agents get a way in. Per-member API keys unlock the whole REST API and a built-in MCP server, so a coding agent can read a board, flip regions once it has verified what actually shipped, and hand back the share link — with every edit landing in the audit log under the key owner's name. Navigation across the app is now instant, and component work moves into Storybook. **One new migration (`0007`) — run `pnpm migrate` on upgrade.**

### Agents & API

- **API keys.** Sign-in is OIDC, which only a human in a browser can complete, so scripts and agents authenticate with keys instead (avatar menu → **API keys**). Keys are stored as a sha256 hash — the secret is shown once and never again — carry a role ceiling, and **expire after 90 days by default** (30/60/90 days, a year, or an explicit no-expiration). Expiry is enforced in the same query that resolves the key, so there is no cleanup job to run or forget.
- **Keys can't outlive their owner's access.** The effective role is the _lower_ of the key's role and the member's current role, resolved through the membership row on every request. Demote someone and their keys demote with them; remove them and their keys stop resolving. Keys also can't mint or list keys — that needs a browser session, so a leaked key can't multiply itself.
- **Owners can inventory the workspace.** `/settings/api-keys` shows owners every key in the workspace with its owner, last use, and expiry, and lets them revoke any of it. A credential nobody can inventory is a liability.
- **A built-in MCP server** at `/api/mcp`, with nine tools covering boards, regions, and share links. It's a stateless Streamable HTTP endpoint written against the protocol directly — no SDK, no extra process, no outbound calls — so it works airgapped like everything else here, and the whole protocol surface is two files you can audit.
- **An installable agent skill.** `npx skills@latest add saschb2b/stateboard` teaches a coding agent the parts a tool description can't: the three-state semantics, normalized `[0,1]` coordinates, and the discipline of verifying a feature works before flipping its region to `shipped`.
- **Docs.** A new [Agents & API](https://saschb2b.github.io/stateboard/docs/agents) guide covers minting a key, wiring an MCP client, the tool table, and the REST calls.

### Instant navigation

- **Every page renders its shell immediately.** Cache Components and Partial Prefetching are enabled, so Next.js prefetches a reusable loading shell per route and paints it the moment you click, streaming the real content in behind it. The board list, editor, share view, history, and settings pages all partial-prerender now.
- **Loading shells for the routes that lacked them** — sign-in, the three settings pages, and board history/settings — so no navigation falls back to a blank wait.
- **Next.js 16.3**, which also brings a large dev-server memory reduction and faster rebuilds.

### Under the hood

- **Storybook**, with stories for the components that carry the product's visual language: the state chips, the region overlay, Present mode over the example board, the header, sign-in, and both workspace admin surfaces. Every story renders in a real browser as a test, and CI runs them as their own job.
- **Components are sliced by domain** — `app/`, `auth/`, `board/`, `screen/`, `region/`, `workspace/`, `site/` — mirroring the primitive the product is built on, and components named after what they are rather than the page they happen to sit on.
- **The repo is set up for coding agents.** A committed `.mcp.json` wires the Next.js devtools and Storybook MCP servers, and `AGENTS.md` points agents at the version-matched Next.js docs bundled in `node_modules`.

### Fixed

- **The product typeface actually loads everywhere.** Geist is now shared from one module by the app and Storybook; previously a missing font variable invalidated the whole `font-family` declaration and dropped affected surfaces to the browser's default serif. Geist Mono — shipped but never used — now renders every id, token, and coordinate readout instead of the system `monospace` keyword, which is Courier New on Windows.
- **Sharing docs described v0.** They called the share URL an unchangeable "slug"; share links have been revocable tokens, several per board, since v1. Corrected, along with the release version the README and docs landing page advertised.

### Dependencies

- Next.js 16.3.1, React 19.2.8, better-auth 1.6.30, and routine patch/minor upkeep across `pg`, `prettier`, `typescript-eslint`, `fumadocs-mdx`, `@types/node` 26, and the GitHub Actions used in CI.

## 2026.7.0

The audit log grows a UI and a per-board history, every board and region shows who last touched it, and the editor is reworked into a three-pane workspace with a `Ctrl` / `Cmd` + `K` command palette. **One new migration (`0006`) — run `pnpm migrate` on upgrade.**

### Accountability

- **See who wrote what.** The editor shows "Created by …" under the board header and a muted "Last edited by … · _when_" on each region, resolved from data StateBoard already recorded (a member who has since left still resolves by name). Editor-only; never rendered on the public share link.
- **Audit-log UI.** `/settings/audit` (owners) finally surfaces the append-only log that's been written since v1. Filter by actor / action / resource / date, keyset-paginated, with a one-shot CSV export — UTC timestamps, RFC-4180 quoting, and defended against spreadsheet formula injection.
- **Per-board history.** `/boards/[id]/history`, reached from the board's overflow menu, shows a single board's own history — screens, regions, share links — to anyone with access to that board. Workspace-admin events (member changes) stay in the owner-only view. Adds migration `0006`, which denormalizes `board_id` onto the audit log with a best-effort backfill, so a board's history survives deletion of the screen or region a row targeted.

### Editor

- **Three-pane workspace.** The editor is now a full-height shell. A left **screens sidebar** replaces the horizontal tab row: a vertical list that scales, where each entry is a thumbnail with its region boxes painted on (a mini-map of the annotated screen). It collapses to a rail and auto-tucks the moment you start working on the canvas. The **canvas** grows to fill the space and fits itself to it. The right **inspector** is now contextual — it slides in only to edit a region and otherwise gets out of the way, so the canvas spans full width.
- **Command palette (`Ctrl` / `Cmd` + `K`).** A board-scoped jumper from a centered search field: fuzzy-match a screen by name, or a region by its label or a phrase you remember from its notes, and jump straight there (the region is selected on arrival). Grouped results, keyboard-first, plus quick board actions.
- **Region text saves on a debounce.** Labels and notes persist when you pause typing or click away, instead of on every keystroke — one audit entry per edit, and no more characters (like spaces) dropped mid-type.
- **Cleaner header.** Sharing is one split-button (copy, with open-view and manage-links in its menu); board history and settings fold into a single overflow menu; the state filter is separated from the actions; the search field is centered.
- **Browser tabs are tellable apart.** The boards list, editor, settings, members, history, and audit pages set real page titles (the editor and settings carry the board's name) instead of all reading "StateBoard · Show, don't tell."

### Share view

- **The artifact carries a date.** The share page shows "Updated 3d ago" in its totals row, the same freshness label the board overview already had. A status report you can't date is a status report you can't trust.
- **Region notes work without a mouse.** On read-only surfaces (share view, Present mode, viewer-role editor) every region is a keyboard tab stop: focusing it exposes the state, label, and notes to screen readers. On phones and tablets a plain tap opens the note; no more undiscoverable long-press.
- **Share links unfurl properly.** OpenGraph tags carry the board's name and description into Slack, Teams, and email previews. Deliberately no `og:image`; the board's visual content stays behind the token.

### Fixed

- **The GitHub Pages site is indexable again.** The global `noindex` shipped with v0, when the app only existed as a private deployment, and the public marketing/docs/demo site inherited it by accident. Self-hosted instances keep `noindex`.
- The Pages demo stub sets a page title and loses a stray em dash.

### Under the hood

- The fuzzy-search scoring, audit filtering / CSV encoding, and authorship resolution are pure, unit-tested modules; the `node:test` suite grows to 119 cases.
- Dependencies bumped within their majors; CI's `actions/checkout` moves to v7.

## 2026.6.0

A feature-and-polish release on top of `2026.5.1`. The board overview becomes an at-a-glance dashboard, regions are directly editable, boards can be duplicated, and self-hosting behind an internal or self-signed CA is now a first-class path. No breaking changes, no new migrations.

### Overview

- **Mini-board card previews.** Each board on `/boards` shows a swipeable carousel of its screens with the state-colored regions painted on, so a board reads at a glance instead of as a name. Dots, hover arrows, a `1 / N` counter, and native touch swipe.
- **Status and freshness on every card.** A `shipped` / `mock` / `missing` count plus a relative "last touched" time.
- **One-click back to the overview.** The top-left wordmark returns to your boards from inside the editor instead of bouncing out to the marketing page.
- **Duplicate a board.** Deep-copies every screen (with its own copy of the image bytes), every region, and a fresh share link into a `… (copy)` board, for when a new board is mostly an old one with a screen or two swapped.

### Editor

- **Move and resize regions.** Drag a region to reposition it or pull a corner to resize it. No more delete-and-redraw. Arrow keys nudge the selected region; hold Shift to resize from the keyboard.
- **Reorder screens** by dragging their tabs; the order carries through to the share view and Present mode.
- **Reuse a screenshot across boards.** The Add-screen dialog now splits into Upload and Reuse tabs. Reuse is a searchable, multi-select gallery of screenshots from your other boards, grouped by board. Pick one or several to drop into this board without re-uploading. The image bytes are copied, so the new screen is independent and starts unannotated.
- **Replace a screen's image, keep its regions.** "Replace image" swaps the screenshot under an existing screen (upload a newer shot or reuse one from the workspace) while every rectangle you've drawn stays put. No more delete-and-redraw when a screen just got a fresh capture; the normalized coordinates re-render against the new picture.
- **Board settings.** A gear in the editor opens per-board settings (`/boards/[id]/settings`) with a section sidebar. **General** renames the board, edits its description, and deletes the board from a GitHub-style Danger Zone behind a type-the-name confirmation (which removes its screens, regions, share links, and image files). **Sharing** mints public links named per audience, copies them, and revokes any one without affecting the others. Reach it in one click via "Manage links" in the editor's Share menu.
- **Keyboard-accessible region list.** List items are focusable buttons, so the `1` / `2` / `3` state shortcuts are reachable without a mouse.

### Share view

- **The three states explain themselves.** The totals row now spells out each state ("Live & real", "UI built, data fake", "Not built yet"), so an exec reads the artifact cold.

### Self-hosting

- **Internal / self-signed CA support.** Trust your IdP's certificate via `NODE_EXTRA_CA_CERTS`. A first-class Helm `caCert` value (inline PEM or an existing Secret/ConfigMap) mounts the bundle and wires the env, with a documented Docker / Compose path. The secure fix: verification stays on.

### Polish & docs

- **Loading skeletons** on the boards list, editor, and share view, so navigations fill in place instead of flashing blank.
- **Plainer punctuation** across the app and docs (em dashes removed), consistent screen alt text, an honest 404 button label, and a cleaner landing pull-quote.
- **Docs corrected to match shipped v1.** The FAQ and getting-started had drifted back to the v0 wedge (SQLite, "no auth"); fixed a broken docs anchor, and documented the new editor and clone features.

### Under the hood

- Region move/resize/nudge geometry extracted to a pure, unit-tested module; the `node:test` suite grows to 77 cases.

## 2026.5.1

A fix release for `2026.5.0`. **Headline: sign-in actually works now.** Two mismatches introduced by the Better Auth dependency bump broke OIDC sign-in on a fresh `2026.5.0` install. Every attempt ended in a 500 or a Keycloak `invalid_redirect_uri`. Anyone running `2026.5.0` should upgrade.

### Fixed: sign-in (broken in 2026.5.0)

- **Better Auth columns match the library again.** They were created snake_case while Better Auth queries camelCase (`expiresAt`, `emailVerified`, `userId`, …), so sign-in 500'd with `column "expiresAt" of relation "verification" does not exist`. New migration `0005` renames them: data, indexes, and foreign keys preserved.
- **OIDC callback path corrected** to `/api/auth/oauth2/callback/keycloak` (Better Auth's genericOAuth path). The bundled realm and every setup doc had registered `/api/auth/callback/keycloak`, which Keycloak rejected.
- **`pnpm migrate` now loads `.env`**, so `cp .env.example .env && pnpm migrate` creates the schema instead of failing with "DATABASE_URL required".

### Fixed: deployment

- Base64 DB passwords (e.g. from `openssl rand -base64`) no longer break `DATABASE_URL` parsing; the parse-error log masks the password rather than leaking or hiding it entirely.

### Hardened

- Free-text fields (name / description / label / notes) and JSON request bodies are length-capped on every write. The uploads route sends `X-Content-Type-Options: nosniff` and turns a truncated image into a clean 400 instead of a 500. The region box invariant (`x+w`, `y+h` ≤ 1) is enforced on PATCH as well as POST.

### Editor & accessibility

- Failed saves now surface an error instead of silently doing nothing.
- The editor's "open share view" icon button has an accessible name.

### Under the hood

- A zero-dependency `node:test` suite now covers the coordinate/validation logic, the example board's invariants, the role-rank authorization check, and the `DATABASE_URL` redaction. CI runs on Node 26 to match the runtime image.

---

## 2026.5.0: Team-ready

The first stable cut. You can stand StateBoard up in a company, hand the URL to your stakeholders, and stop pasting screenshots into Confluence.

### What you get

- **The primitive:** screenshot → drag rectangles → tag each one `SHIPPED` / `MOCK` / `MISSING` → share one link. Three states, no more. Stakeholders read a board in 30 seconds without logging in.
- **Multi-user via OIDC.** Sign-in is delegated to your IdP. Keycloak is the documented default, but any OIDC discovery URL works (Auth0, Okta, Entra, Authentik, Dex…). No email/password to manage, no invite emails to send.
- **Workspaces & roles.** A single workspace per deployed instance with `owner` / `editor` / `viewer` roles. Boards belong to the workspace, so when a teammate leaves, their boards stay.
- **Revocable share links.** Mint multiple public links per board, name them per audience, kill any one without affecting the others.
- **Append-only audit log.** Every board / region / share-link / membership change writes a row in Postgres. (No UI yet; query the table directly until v3.)
- **Self-host, airgap-adjacent.** One container, one Postgres, one IdP. Zero outbound calls to any third-party at runtime.

### Editor

- **Region list panel** with keyboard shortcuts: arrow keys to navigate, `Tab` between regions, number keys to set state.
- **Labels anchor to their box** so they don't drift when the screenshot resizes.
- **Filter the canvas by state** by clicking a state pill in the header.
- **Inline-edit** board and screen names, no dialog round-trip.
- **Present mode** for fullscreen, distraction-free walkthroughs.

### Marketing surface

- **Landing page** at `/` with a working mockup of a board.
- **Docs site** at `/docs` (Fumadocs + MDX) with full-text search.
- **Read-only static demo** auto-published to GitHub Pages on every push, the same example board the empty-state link points to.

### Deployment

- **Docker image** published to GHCR: `ghcr.io/saschb2b/stateboard:2026.5.0` (also `:latest`, `:2026.5`, and `:sha-…`).
- **Helm chart** under `deploy/helm/stateboard`: single-replica by default, multi-replica safe with a `ReadWriteMany` PVC. Fails closed if `auth.secret` is empty.
- **Runtime image** is now Node 26 on Debian Bookworm slim.

### Migrating from v0

Legacy v0 URLs keep working: `/b/:id` and `/v/:slug` redirect permanently to `/boards/:id` and `/share/:slug`, so any links shared before this release stay live.

### Known limitations (intentional)

The roadmap is staged. The following are explicitly **not** in this release; ask before opening an issue:

- Headless capture from a URL → v1.x
- Scheduled re-capture, diff / time-travel → v2
- Jira / Linear / Slack integrations → v1.x to v2
- Region comments, real-time collaboration → out of scope
- Audit-log UI, SAML/SSO beyond OIDC → v3

See [`CLAUDE.md`](./CLAUDE.md) for the full staging.

---

[Compare on GitHub](https://github.com/saschb2b/stateboard/commits/v2026.5.0)
