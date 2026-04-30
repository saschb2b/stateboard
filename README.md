# StateBoard

[![CI](https://github.com/saschb2b/stateboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/saschb2b/stateboard/actions/workflows/ci.yml)
[![Docker](https://github.com/saschb2b/stateboard/actions/workflows/docker.yml/badge.svg?branch=main)](https://github.com/saschb2b/stateboard/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

> Status reporting for visual products — built around the screens stakeholders actually see, not the tickets engineers actually file.

**Show, don't tell.** Upload a screenshot of your app. Drag rectangles over the parts you want to talk about. Tag each one as `SHIPPED`, `MOCK`, or `MISSING`. Share one link. Your exec reads it in 30 seconds.

Open source. Self-hosted. Airgap-ready. MIT.

---

## v0 (the wedge)

This is `v0` — the smallest thing that proves the thesis.

- Manual screenshot upload (PNG / JPEG / WebP / GIF, up to 25 MB)
- Region tagging on the image (click + drag)
- Three states: `shipped` / `mock` / `missing`
- Public read-only share link
- Single user, no auth — designed to live behind your VPN or on `localhost`
- One container. SQLite. Zero outbound calls.

What's not here yet (by design — see [the build plan](#roadmap)): multi-user auth, headless capture, Jira sync, scheduled re-capture, diffs, journeys.

## Quick start

### Local development

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

Data — the SQLite database and uploaded screenshots — is written to `./data/`. You can point this elsewhere with `STATEBOARD_DATA_DIR=/some/path`.

### Docker

```bash
docker build -t stateboard .
docker run --rm -p 3000:3000 -v stateboard-data:/data stateboard
```

That's it. No license server, no phone-home, no telemetry. Mount `/data` as a volume to persist your boards across restarts.

### Kubernetes (Helm)

```bash
helm install stateboard ./deploy/helm/stateboard \
  --namespace stateboard --create-namespace \
  --set image.tag=0.1.0
```

The chart is single-replica by design (SQLite on a `ReadWriteOnce` PVC) and will refuse to render with `replicaCount > 1`. See [`deploy/helm/stateboard/README.md`](./deploy/helm/stateboard/README.md) for the full values reference.

## How it works

1. **Create a board** from the home page.
2. **Upload a screenshot.** StateBoard records its dimensions and stores the image under `./data/uploads/`.
3. **Drag a rectangle** on the screenshot. A side panel opens — pick a state, label the region, add notes if you want.
4. **Repeat** for every region you care about.
5. **Click Share.** You get a link of the form `/v/{slug}` that anyone can read. No login. The share view is the same screens, painted with state.

Region coordinates are stored as relative `[0..1]` values, so the same annotations render correctly at any display size.

## Architecture

| Piece        | Choice                               | Why                                           |
| ------------ | ------------------------------------ | --------------------------------------------- |
| Framework    | Next.js 16 (App Router)              | One process serves UI + API + uploads         |
| UI           | React 19 + MUI 7                     | Solid component library, small enough to skin |
| Persistence  | SQLite via `better-sqlite3`          | Zero-ops, fits the "one container" pitch      |
| File storage | Local filesystem (`./data/uploads/`) | Same volume as the DB, no S3 dependency       |
| Auth         | None (v0)                            | Single user, behind your network              |
| Telemetry    | None                                 | Airgap by default — that's the point          |

Source layout:

```
src/
├── app/                 # Next.js App Router
│   ├── api/             # REST endpoints (boards, screens, regions, uploads)
│   ├── b/[id]/          # Board editor
│   ├── v/[slug]/        # Public read-only share
│   ├── layout.tsx
│   └── page.tsx         # Board list
├── components/          # React components (client + server)
└── lib/                 # db, types, theme, image utils
```

Everything that touches disk lives in `src/lib/db.ts` and `src/lib/paths.ts`.

## Scripts

| Command             | What it does             |
| ------------------- | ------------------------ |
| `pnpm dev`          | Run on `localhost:3000`  |
| `pnpm build`        | Production build         |
| `pnpm start`        | Run the production build |
| `pnpm lint`         | ESLint                   |
| `pnpm typecheck`    | `tsc --noEmit`           |
| `pnpm format:check` | Prettier check           |
| `pnpm format`       | Prettier write           |

## Configuration

| Env var               | Default  | Purpose                                       |
| --------------------- | -------- | --------------------------------------------- |
| `STATEBOARD_DATA_DIR` | `./data` | Root of all on-disk state (`db/`, `uploads/`) |
| `PORT`                | `3000`   | HTTP port                                     |

## Roadmap

This is `v0`. The pitch deck has a four-stage build plan:

- **v0 — the wedge** (you are here): manual upload, region tagging, three states, share link, single user
- **v1 — team-ready**: multi-user, OIDC, headless capture from URL, Jira issue linking, custom states, public GitHub release
- **v2 — make it living**: scheduled re-capture, time-travel / diff view, two-way Jira sync, Slack notifications, Notion/Confluence embed
- **v3 — defensible**: auto region-detection from the DOM, journey-level views, portfolio rollup, SSO, audit log, public template gallery

The temptation will be to chase roadmap-tool features. We won't. The lane is **screens, regions, states, and the integrations that keep them honest** — and nothing else.

## License

MIT. Use it, fork it, ship it inside your product, sell consulting around it. The license means what it says.
