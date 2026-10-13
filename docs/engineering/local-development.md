---
type: Runbook
title: Local development
description: Start or reuse the app, Postgres, and OIDC services without changing real workspace data.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T22:08:45Z
sources:
  - id: readme
    resource: "README.md"
  - id: env
    resource: ".env.example"
  - id: compose
    resource: "docker-compose.yaml"
  - id: package
    resource: "package.json"
  - id: tools
    resource: ".mcp.json"
  - id: browser-config
    resource: "agent-browser.json"
  - id: browser-skill
    resource: ".agents/skills/agent-browser/SKILL.md"
  - id: browser-core
    resource: "agent-browser 0.39.1: pnpm browser skills get core, read on 2026-10-14."
---

Use the existing local services when present. Inspect the active branch, working tree, listening ports, and `.next/dev/lock` before starting another app server. Preserve unrelated edits and workspace data.

For a fresh clone, follow this sequence from the repository root:[^readme]

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm migrate
pnpm dev
```

Do not overwrite an existing `.env`. Local Compose provides Postgres on port 5432 and Keycloak on 8080. The app runs on port 3000. The bundled realm provides `alice` and `bob`, with matching usernames/passwords for development. The first sign-in becomes workspace owner.[^compose]

Keep secrets and machine-specific connection settings out of commits and logs. Production needs its own credentials, TLS, persistent data, and configured OIDC redirect URI. The local defaults are development fixtures.[^env]

## Development surfaces

| Surface           | Start or location                         | Purpose                                                  |
| ----------------- | ----------------------------------------- | -------------------------------------------------------- |
| App               | `pnpm dev`, `http://localhost:3000`       | Real authenticated product flow.                         |
| Storybook         | `pnpm storybook`, `http://localhost:6006` | Prop-driven components and interactions.                 |
| Visual example    | `/share/demo`                             | Read-only in-memory visual board.                        |
| Readiness example | `/share/demo/releases`                    | Read-only in-memory assessment and profession views.     |
| Next devtools     | `.mcp.json`                               | Discover the running development server and diagnostics. |
| Storybook MCP     | `http://localhost:6006/mcp`               | Component tooling while Storybook runs.                  |
| Agent Browser     | `pnpm browser`                            | Optional CLI for complete browser workflows.             |

Discover MCP tool capabilities before using them. Development MCP tools are optional aids, with no product credentials preconfigured.[^tools]

Use shipped in-memory examples for fixtures. Never seed sample data into a user's database. Use [isolated verification](verification.md) for write tests. The [runtime architecture](../architecture/runtime.md) explains the service boundaries.

## Browser review

Use the pinned Agent Browser CLI when the host permits command-line browser automation. Follow host-required browser tools and permissions when they apply. This development tool does not add browser execution to the StateBoard server.[^package]

1. Run `pnpm browser:install` once to download the browser.
2. Read `pnpm browser skills get core` before browser commands.
3. For exploratory testing, also read `pnpm browser skills get dogfood`.
4. Choose a session name unique to your task and agent.
5. Open the app, inspect a snapshot, then act on its observed refs.
6. Refresh the snapshot after page changes and test the relevant keyboard paths.
7. Close only your named session when finished.[^browser-core]

For example, replace `stateboard-home-review-main` with your session name:

```bash
export AGENT_BROWSER_SESSION=stateboard-home-review-main
pnpm browser open http://localhost:3000
pnpm browser snapshot -i
pnpm browser set viewport 1440 1000
pnpm browser screenshot --full
pnpm browser set viewport 390 844
pnpm browser snapshot -i
pnpm browser screenshot --full
pnpm browser close
```

The project configuration labels page content as untrusted and saves default screenshots under `.agents/browser/`. It contains no credentials, profile, or automatic connection settings.[^browser-config] Save explicit screenshot paths, recordings, profiles, and state files in that ignored directory too. Keep credentials out of commands and logs. Do not use the shared unnamed session or close other agents' sessions.[^browser-core]

Use snapshots to find controls, then inspect screenshots to judge layout. Neither replaces assertions about actual behavior. Follow [verification](verification.md) for evidence and regression checks.

[^readme]: Fresh-clone sequence and first sign-in.

[^env]: Environment names and development defaults.

[^compose]: Local services, ports, and imported development realm.

[^package]: App and Storybook commands.

[^tools]: Optional development MCP configuration.

[^browser-config]: Project defaults for untrusted content boundaries and screenshot storage.

[^browser-skill]: Checked-in upstream discovery skill and its version-matched CLI workflows.

[^browser-core]: Installed CLI guidance for snapshots, named sessions, screenshots, and cleanup.
