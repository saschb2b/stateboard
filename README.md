# StateBoard

[![Release](https://img.shields.io/github/v/release/saschb2b/stateboard?display_name=tag&sort=semver&label=release&color=ea580c)](https://github.com/saschb2b/stateboard/releases/latest)
[![CI](https://github.com/saschb2b/stateboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/saschb2b/stateboard/actions/workflows/ci.yml)
[![Docker](https://github.com/saschb2b/stateboard/actions/workflows/docker.yml/badge.svg?branch=main)](https://github.com/saschb2b/stateboard/actions/workflows/docker.yml)
[![Pages](https://github.com/saschb2b/stateboard/actions/workflows/pages.yml/badge.svg?branch=main)](https://saschb2b.github.io/stateboard/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

📦 **Current release:** [`2026.8.0` (team-ready)](https://github.com/saschb2b/stateboard/releases/latest). See the [changelog](./CHANGELOG.md) for what shipped and what's intentionally not here yet.

🟢 **[Live read-only demo →](https://saschb2b.github.io/stateboard/)**. The published demo follows the current release. This working tree also includes a permanent readiness example at `/share/demo/releases`; deploy it to explore all six views. Editing needs the self-hosted version.

> Show what works, what it depends on, and why it is ready to release — with a view for everyone involved.

**Show, don't tell.** Describe product capabilities, connect their dependencies, and assess a named candidate using matching verification evidence. Product, frontend, backend, QA, operations, and release owners inspect the same assessment through six views. Annotated screenshots remain the visual delivery view.

Open source. Self-hosted. Airgap-ready (except for your own SSO). MIT.

---

## v1 (team-ready)

This is `v1`, the cut you can deploy in a company.

- Manual screenshot upload (PNG / JPEG / WebP / GIF, up to 25 MB)
- Region tagging on the image (click + drag)
- Three states: `shipped` / `mock` / `missing`
- Public read-only share links: revocable, multiple per board
- **Multi-user via Keycloak / OIDC** (any OIDC-compliant IdP works; Keycloak is the documented default)
- **Roles**: owner / editor / viewer
- **Append-only audit log** of mutations, with owner-only workspace audit and per-board history
- **Agent access**: per-member API keys + a built-in MCP server, so agents can read boards and flip region states — see [Agent access](#agent-access-api-keys--mcp) below
- Postgres-backed, multi-replica safe (with `ReadWriteMany` for uploads)
- One container + one Postgres. Zero outbound calls except to your IdP.

What's not here yet (by design, see [the build plan](#roadmap)): headless capture, Jira sync, scheduled re-capture, diffs, journeys.

## Release readiness MVP (implemented, unreleased)

This working tree implements the full MVP; the latest published release remains `2026.8.0`.

- Reusable capabilities and owners, including outcomes with no UI; optional links to screenshot regions
- Workspace components, declared dependencies, focused navigation, and affected capabilities
- Immutable candidate/environment/audience/configuration context, explicit capability scope, and versioned acceptance checks
- Manual, REST, and MCP-submitted evidence with context, provenance, idempotency, history, and freshness
- AI-maintained capabilities, dependencies, scope, and checks through REST/MCP and the packaged agent skill
- Explainable `ready` / `blocked` / `needs_evidence` calculation, with mandatory failures and unknowns kept visible
- Six views over one assessment, with a URL that preserves the selected view
- Human owner approvals/holds with frozen definitions, evidence, wiring, rationale, and selected retained media
- Private image uploads and curated public decision summaries with selected safe media and revocable tokens
- An in-memory example at `/share/demo/releases`, without seeded workspace data

Board cards open the readiness workspace; **Screens** opens the existing visual editor. Required functional acceptance checks determine readiness, while `shipped` / `mock` / `missing` retain their existing visual meanings. Approval records a decision and does not deploy a release.

**Upgrade:** run `pnpm migrate` to apply `0008`–`0010`. Keep `STATEBOARD_DATA_DIR` persistent and backed up alongside Postgres, including both `uploads` and `release-assets`. Existing board images remain public/cached; confidential release images use the separate private directory. Boards with release history cannot be deleted through ordinary deletion.

Read the [usage guide](./src/content/docs/release-readiness.mdx) and [implementation contract](./src/content/docs/release-readiness-mvp.mdx). The real team pilot and external GitHub milestone reconciliation are follow-up work.

The [persona iteration journal](./src/content/docs/persona-iteration.mdx) records local use of StateBoard to review its own Codex-assisted delivery, including simulated-role findings, refinements, validation and unresolved claims. It does not replace the external team pilot.

## Agent access (API keys + MCP)

Agents, scripts, and CI can't complete an OIDC sign-in — they authenticate with **API keys** instead (avatar menu → **API keys**). Keys are hash-only server-side, role-capped, expire after 90 days by default, and every edit they make lands in the audit log. Owners can inventory and revoke every key in the workspace. A key unlocks two surfaces:

- **REST** — board editing and release definitions/evidence accept `Authorization: Bearer sbk_…` with the same role rules as the editor. Recording release decisions and publishing/revoking release links require a current owner browser session; API keys cannot perform them. Key management also requires a session.
- **MCP** — a built-in, zero-dependency [MCP server](https://modelcontextprotocol.io) at `/api/mcp`. The development build adds product context, capabilities, dependencies, assessments, scope, versioned checks, evidence submission, history, and calculated readiness to the existing visual tools. No SDK, extra process, or server-side LLM is needed.

```bash
# Connect Claude Code to your instance
claude mcp add --transport http stateboard https://your-instance/api/mcp \
  --header "Authorization: Bearer sbk_your_key"

# Teach any coding agent the StateBoard workflow
# (repository reconciliation, exact-candidate evidence, truthful visual status)
npx skills@latest add saschb2b/stateboard
```

After a member creates a key, an agent can inspect the project, reuse or create the relevant capabilities and components, connect their dependencies, define a candidate and checks, run verification, and submit the results. On later changes it reconciles those same records rather than asking people to enter the data again. CI can push new observations through REST. The agent returns the release conclusion, unresolved claims, and an assessment link for human review.

Source-derived wiring is declared context; only actual observations support checks. The server calculates readiness, and a human owner records the release decision and controls publication. Maintenance runs in the connected agent or CI; StateBoard does not run a background AI service or fetch evidence URLs. The latest published `2026.8.0` build still exposes only the visual MCP tools; the expanded surface is unreleased.

Full guide: [Agents & API](./src/content/docs/agents.mdx). The installable workflow lives in [`skills/stateboard/SKILL.md`](./skills/stateboard/SKILL.md).

For repository development, start with [`AGENTS.md`](./AGENTS.md), the [knowledge base](./docs/index.md), and the [design system](./docs/design-system/overview.md). `CLAUDE.md` imports the same operating manual. The five repository skills live in `.agents/skills/` and are checked in with the project.

## Quick start (local dev)

The repo ships a `docker-compose.yaml` with Postgres + Keycloak pre-seeded with two test users (`alice` / `bob`, password = same as username).

```bash
cp .env.example .env
docker compose up -d           # starts postgres + keycloak
pnpm install
pnpm migrate                    # creates tables
pnpm dev
```

Open <http://localhost:3000>, click **Continue with Keycloak**, sign in as `alice`. The first sign-in becomes the workspace owner.

## Production: Docker Compose (bring your own Keycloak)

If you already run Keycloak (or any other OIDC provider) and just want StateBoard + a Postgres next to it, [`deploy/docker-compose.yaml`](./deploy/docker-compose.yaml) is the path. Postgres + StateBoard + a one-shot migrate job, no bundled IdP.

```bash
cp deploy/docker-compose.env.example deploy/.env
# edit deploy/.env: set STATEBOARD_BASE_URL, BETTER_AUTH_SECRET,
# POSTGRES_PASSWORD, and the three KEYCLOAK_* vars
docker compose -f deploy/docker-compose.yaml --env-file deploy/.env up -d
```

In your existing Keycloak realm, create a confidential client and register `<STATEBOARD_BASE_URL>/api/auth/callback/keycloak` as a Valid redirect URI. See [Self-hosting → Keycloak setup](https://saschb2b.github.io/stateboard/docs/self-hosting#keycloak-setup) for the full checklist. Same env-var names work with any OIDC IdP; only the issuer URL changes.

Terminate TLS at your reverse proxy (Caddy, nginx, Traefik, a cloud LB) so `STATEBOARD_BASE_URL` is HTTPS.

## Production: Helm

```bash
helm dependency build deploy/helm/stateboard
helm install stateboard ./deploy/helm/stateboard \
  --namespace stateboard --create-namespace \
  --set auth.baseUrl=https://stateboard.example.com \
  --set auth.secret="$(openssl rand -base64 32)" \
  --set auth.keycloak.issuer=https://keycloak.example.com/realms/acme \
  --set auth.keycloak.clientSecret=... \
  --set postgresql.auth.password="$(openssl rand -hex 32)"
```

The chart bundles a Bitnami Postgres sub-chart by default. Disable with `--set postgresql.enabled=false` and provide `--set externalDatabaseUrl=...` (or read it from a Secret via `externalDatabaseUrlExistingSecret`). See [`deploy/helm/stateboard/values.yaml`](./deploy/helm/stateboard/values.yaml) for the full reference.

A pre-install / pre-upgrade Job runs `pnpm migrate` before any pods come up. Disable with `--set migrate.enabled=false` if you'd rather run schema changes out-of-band.

## Architecture

| Piece        | Choice                  | Why                                                  |
| ------------ | ----------------------- | ---------------------------------------------------- |
| Framework    | Next.js 16 (App Router) | One process serves UI + API + uploads                |
| UI           | React 19 + MUI 7        | Solid component library, small enough to skin        |
| Persistence  | Postgres via `pg`       | Multi-replica safe; standard ops your team knows     |
| Auth         | Better Auth + OIDC      | First-class Keycloak helper; sessions in the same DB |
| File storage | Local filesystem        | RWX PVC; S3-compatible adapter remains deferred      |
| Telemetry    | None                    | Airgap by default, that's the point                  |

Everything that touches the DB lives in `src/lib/db.ts`. Auth wiring is in `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (browser). Schema is plain SQL under `migrations/`, applied by `scripts/migrate.mjs`.

## Scripts

| Command                       | What it does                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm dev`                    | Run on `localhost:3000`                                                                    |
| `pnpm build`                  | Production build                                                                           |
| `pnpm start`                  | Run the production build                                                                   |
| `pnpm migrate`                | Apply pending SQL migrations against `DATABASE_URL`                                        |
| `pnpm lint`                   | ESLint                                                                                     |
| `pnpm typecheck`              | Generate Fumadocs types, then run `tsc --noEmit`                                           |
| `pnpm test`                   | Unit tests on Node's built-in runner (`node:test`)                                         |
| `pnpm test:stories`           | Component interaction tests in Chromium                                                    |
| `pnpm test:integration`       | Release and MCP integration tests against `STATEBOARD_INTEGRATION_DB_URL`                  |
| `pnpm cleanup:release-assets` | Dry-run of orphan media cleanup; `--delete` removes unreferenced files older than 24 hours |
| `pnpm format:check`           | Prettier check                                                                             |
| `pnpm format`                 | Prettier write                                                                             |
| `pnpm docs:check`             | Validate knowledge, design, links, token projections, and pinned repository skills         |
| `pnpm design:generate`        | Regenerate design token outputs from the design-system foundations                         |

## Configuration

| Env var                            | Default       | Purpose                                                               |
| ---------------------------------- | ------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`                     | _required_    | Postgres connection string                                            |
| `STATEBOARD_BASE_URL`              | _required_    | Public URL the app reaches itself at                                  |
| `BETTER_AUTH_SECRET`               | _required_    | 32-byte base64 secret for session cookies (`openssl rand -base64 32`) |
| `KEYCLOAK_ISSUER`                  | _required_    | Realm URL, e.g. `https://keycloak.example.com/realms/acme`            |
| `KEYCLOAK_CLIENT_ID`               | _required_    | Confidential client id                                                |
| `KEYCLOAK_CLIENT_SECRET`           | _required_    | Client secret                                                         |
| `STATEBOARD_ALLOWED_EMAIL_DOMAINS` | _empty_ (any) | Comma-separated allowlist                                             |
| `STATEBOARD_DEFAULT_ROLE`          | `editor`      | Role given to non-first sign-ins                                      |
| `STATEBOARD_DATA_DIR`              | `./data`      | Root of upload storage                                                |
| `PORT`                             | `3000`        | HTTP port                                                             |
| `NODE_EXTRA_CA_CERTS`              | _unset_       | Path to a PEM CA bundle to trust for an internal/self-signed IdP cert |

## Roadmap

- **v0 (the wedge)** ✅: manual upload, region tagging, three states, share link, single user
- **v1 (team-ready)** ✅: multi-user, OIDC, audit log, Postgres; audit UI shipped in `2026.7.0`, API keys + MCP in the current release `2026.8.0`
- **v2 (release-readiness MVP)** — implemented in this working tree, unreleased: candidate-specific assessments, reusable capabilities, dependencies and owners, applicable evidence, explainable readiness, human decision snapshots, role view presets, and a curated public share view
- **v2.x (keep evidence current)** — planned after the pilot: push evidence integrations, catalog imports, freshness/context comparison, and capability flow views
- **v3 (broader impact and overview)** — planned later: architecture impact navigation, portfolio assessments, and reusable templates

The adopted direction is **show what works, what it depends on, and why we believe it is ready**. Screenshots remain the visual view; capabilities connect them to backend work and verification. The visual states `shipped` / `mock` / `missing` stay separate from release readiness. The MVP records a human decision and does not automatically approve releases or grant exception waivers.

Read the [roadmap source](./src/content/docs/roadmap.mdx) and [concrete MVP implementation plan](./src/content/docs/release-readiness-mvp.mdx). The published [roadmap](https://saschb2b.github.io/stateboard/docs/roadmap) updates after these docs are deployed. [GitHub milestones](https://github.com/saschb2b/stateboard/milestones) and the [project board](https://github.com/users/saschb2b/projects/1) still contain legacy scope; reconciliation is pending.

Headless capture, custom states, Jira links/sync, scheduled capture, diffs, Slack, embeds, S3 storage, DOM region detection, SAML, and the template gallery remain in the reprioritized backlog. The MVP supports agent-maintained definitions and evidence pushes through REST and MCP, preserving self-hosted operation and the runtime network boundary. StateBoard remains an assessment and sharing tool; it does not become a ticket tracker, full developer portal, test runner, or deployment system.

## License

MIT. Use it, fork it, ship it inside your product, sell consulting around it. The license means what it says.
