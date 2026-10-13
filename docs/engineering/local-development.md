---
type: Runbook
title: Local development
description: Start or reuse the app, Postgres, and OIDC services without changing real workspace data.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T21:15:41Z
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

Discover MCP tool capabilities before using them. Development MCP tools are optional aids, with no product credentials preconfigured.[^tools]

Use shipped in-memory examples for fixtures. Never seed sample data into a user's database. Use [isolated verification](verification.md) for write tests. The [runtime architecture](../architecture/runtime.md) explains the service boundaries.

[^readme]: Fresh-clone sequence and first sign-in.

[^env]: Environment names and development defaults.

[^compose]: Local services, ports, and imported development realm.

[^package]: App and Storybook commands.

[^tools]: Optional development MCP configuration.
