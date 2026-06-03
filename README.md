# StateBoard

[![Release](https://img.shields.io/github/v/release/saschb2b/stateboard?display_name=tag&sort=semver&label=release&color=ea580c)](https://github.com/saschb2b/stateboard/releases/latest)
[![CI](https://github.com/saschb2b/stateboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/saschb2b/stateboard/actions/workflows/ci.yml)
[![Docker](https://github.com/saschb2b/stateboard/actions/workflows/docker.yml/badge.svg?branch=main)](https://github.com/saschb2b/stateboard/actions/workflows/docker.yml)
[![Pages](https://github.com/saschb2b/stateboard/actions/workflows/pages.yml/badge.svg?branch=main)](https://saschb2b.github.io/stateboard/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

📦 **Current release:** [`2026.5.1` (team-ready)](https://github.com/saschb2b/stateboard/releases/latest). See the [changelog](./CHANGELOG.md) for what shipped and what's intentionally not here yet.

🟢 **[Live read-only demo →](https://saschb2b.github.io/stateboard/)**. Explore the example board, hover regions, try Present mode. The editor itself needs the self-hosted version (link below).

> Status reporting for visual products, built around the screens stakeholders actually see, not the tickets engineers actually file.

**Show, don't tell.** Upload a screenshot of your app. Drag rectangles over the parts you want to talk about. Tag each one as `SHIPPED`, `MOCK`, or `MISSING`. Share one link. Your exec reads it in 30 seconds.

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
- **Append-only audit log** of mutations (read directly from Postgres for now)
- Postgres-backed, multi-replica safe (with `ReadWriteMany` for uploads)
- One container + one Postgres. Zero outbound calls except to your IdP.

What's not here yet (by design, see [the build plan](#roadmap)): headless capture, Jira sync, scheduled re-capture, diffs, journeys.

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

In your existing Keycloak realm, create a confidential client and register `<STATEBOARD_BASE_URL>/api/auth/oauth2/callback/keycloak` as a Valid redirect URI. See [Self-hosting → Keycloak setup](https://saschb2b.github.io/stateboard/docs/self-hosting#keycloak-setup) for the full checklist. Same env-var names work with any OIDC IdP; only the issuer URL changes.

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
| File storage | Local filesystem        | RWX PVC for v1; S3-compatible adapter planned for v2 |
| Telemetry    | None                    | Airgap by default, that's the point                  |

Everything that touches the DB lives in `src/lib/db.ts`. Auth wiring is in `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (browser). Schema is plain SQL under `migrations/`, applied by `scripts/migrate.mjs`.

## Scripts

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Run on `localhost:3000`                             |
| `pnpm build`        | Production build                                    |
| `pnpm start`        | Run the production build                            |
| `pnpm migrate`      | Apply pending SQL migrations against `DATABASE_URL` |
| `pnpm lint`         | ESLint                                              |
| `pnpm typecheck`    | `tsc --noEmit`                                      |
| `pnpm test`         | Unit tests on Node's built-in runner (`node:test`)  |
| `pnpm format:check` | Prettier check                                      |
| `pnpm format`       | Prettier write                                      |

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
- **v1 (team-ready)** ✅ (you are here): multi-user, OIDC, audit log, Postgres
- **v1.x (still scope-OK)**: headless capture from URL, Jira issue linking, custom states
- **v2 (make it living)**: scheduled re-capture, time-travel / diff view, two-way Jira sync, Slack, Notion/Confluence embed
- **v3 (defensible)**: DOM region-detection, journey views, portfolio rollup, SAML, audit-log UI, template gallery

Full narrative in [`/docs/roadmap`](https://saschb2b.github.io/stateboard/docs/roadmap). Live status: [milestones](https://github.com/saschb2b/stateboard/milestones) for the per-issue rollup, or the [project board](https://github.com/users/saschb2b/projects/1) for a Kanban / Roadmap view.

The temptation will be to chase roadmap-tool features. We won't. The lane is **screens, regions, states, and the integrations that keep them honest**, and nothing else.

## License

MIT. Use it, fork it, ship it inside your product, sell consulting around it. The license means what it says.
