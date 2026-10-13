---
type: Runbook
title: Verification before completion
description: Run the required gates and boundary-specific checks before commits or completion claims.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T21:15:41Z
sources:
  - id: package
    resource: "package.json"
  - id: ci
    resource: ".github/workflows/ci.yml"
  - id: pages
    resource: "scripts/pages-prebuild.mjs"
  - id: integration
    resource: "scripts/mcp-release.test.mjs"
  - id: db-tests
    resource: "scripts/release-db.test.mjs"
  - id: storybook
    resource: ".storybook/preview.tsx"
---

Run focused checks while implementing. Before committing or reporting completion, run all six application gates and the knowledge check:[^package]

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:stories
pnpm build
pnpm docs:check
```

Fix failures at their cause. Do not suppress a check to make the result pass. Format changed files without rewriting unrelated work. Report skipped or unrun checks explicitly. A passing tool call alone does not establish product behavior.

| Changed boundary                                                  | Additional verification                                                                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| UI or navigation                                                  | Exercise the real app at normal and narrow widths. Check applicable authenticated and public paths, keyboard access, focus, and errors. |
| Significant component behavior                                    | Update colocated prop-driven stories. Use meaningful interaction assertions and shared router/theme mocks.                              |
| Release persistence, access, REST/MCP, evidence, revisions, media | Run `STATEBOARD_INTEGRATION_DB_URL=postgres://… pnpm test:integration` against development/test Postgres.                               |
| Runtime routes, docs, examples, static export                     | Run `PAGES_BUILD=1 pnpm build:pages` only in a disposable checkout or CI. Preparation deletes/replaces runtime source files.            |
| Helm deployment                                                   | Follow the CI Helm job: dependency build, lint, kubeconform, multi-replica rendering, and missing-secret rejection.                     |
| Packaged StateBoard skill                                         | Validate frontmatter and exercise a realistic setup/update task against the actual tool contract.                                       |
| Knowledge or design system                                        | Run `pnpm docs:check`. After token edits, run `pnpm design:generate` and inspect the generated diff.                                    |

Integration suites create and remove isolated schemas and media directories. Never reset the application schema or use production for test data. They cover persistence and MCP workflows, including actual key checks and concurrent history reads.[^integration]

Story tests use Chromium. If unavailable, install it with `pnpm exec playwright install chromium`. Component tests do not replace browser review of complete workflows.[^storybook]

The [readiness rules](../product/readiness.md) apply to any evidence recorded from these runs. Identify the exact tested candidate and environment. A simulated persona review does not establish independent human comprehension or production behavior.

[Local development](local-development.md) describes service reuse. [Knowledge maintenance](knowledge-maintenance.md) describes what to update when verification changes the documented behavior.

[^package]: Executable command definitions.

[^ci]: Application, browser, integration, and Helm CI gates.

[^pages]: Guarded but destructive Pages preparation.

[^integration]: Isolated MCP workflow integration suite.

[^db-tests]: Isolated release persistence integration suite.

[^storybook]: Shared Storybook theme and router setup.
