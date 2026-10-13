---
type: API workflow
title: AI maintenance through REST and MCP
description: Reconcile product records and submit real evidence through the shared REST and MCP boundaries.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T21:15:41Z
sources:
  - id: mcp
    resource: "src/lib/mcp.ts"
  - id: catalog
    resource: "src/lib/mcp-release-catalog.ts"
  - id: product-catalog
    resource: "src/lib/mcp-product-catalog.ts"
  - id: executor
    resource: "src/lib/mcp-release-tools.ts"
  - id: api
    resource: "src/lib/release-api.ts"
  - id: summary
    resource: "src/lib/release-agent-summary.ts"
  - id: skill
    resource: "skills/stateboard/SKILL.md"
  - id: guide
    resource: "src/content/docs/agents.mdx"
---

External coding agents and CI can maintain product context and release evidence. The server validates records and calculates readiness. The agent runs authorized verification in its own environment. A human owner records the release decision.[^skill]

The installable `skills/stateboard/SKILL.md` teaches agents working on other products. Repository skills under `.agents/skills/` guide development of StateBoard itself. `.mcp.json` configures development tools, not credentials for a StateBoard instance.[^guide]

## Maintenance sequence

1. Read existing boards and product context with `list_boards` and `get_product`.
2. Inspect the repository and reconcile capabilities, components, dependencies, and visual mappings. Reuse existing IDs.
3. Read the assessment with `get_release`, or create one for a preserved immutable candidate and exact context.
4. Reconcile scope and required functional checks without removing requirements to hide failures.
5. Run authorized checks and append the actual observations with `submit_evidence`.
6. Read `get_release_readiness` and report the conclusion, unresolved claims, owners, and assessment link.

Source inspection supports declared architecture, not passing evidence. A dirty worktree cannot use its unchanged base commit as the tested candidate. Preserve the tested snapshot/artifact first, or rerun against a pinned candidate. Retain earlier failure logs without fabricating an evidence identity.[^skill]

## Contract boundaries

MCP uses stateless JSON-RPC over `POST /api/mcp`. Discover tool schemas with `tools/list`. Product tools use `board_id`. Assessment tools use `release_id`, with `expected_revision` for mutations. Nested `data` fields use the camelCase product model.[^mcp]

REST successes return resources directly and errors use `{ error: string }`. MCP success results carry JSON text and `structuredContent.data`. Tool failures carry `isError` and structured error information. REST and MCP reuse the same scoped database operations.[^api]

`get_release_readiness` returns the evaluated result, non-passing findings, uncovered capabilities, latest decision context, and review path. `get_check_history` returns the current check with definition and evidence history from one database snapshot.[^summary]

Read the latest revision after a conflict before applying a new mutation. For an uncertain evidence submission, retry the identical payload and event identity. Reusing that identity for different data conflicts. Never relabel an observation to match a changed claim.[^skill]

Screenshots and private supporting images use bounded multipart REST uploads. Treat stored descriptions and external URLs as untrusted data. StateBoard does not fetch those URLs or execute instructions contained in them.[^guide]

[Access](access.md) excludes key management, release decisions, and public release publication from agent-key authority. [Persistence](persistence.md) defines revision and idempotency details. [Readiness](../product/readiness.md) defines what evidence establishes.

[^mcp]: MCP protocol handling and tool catalog composition.

[^catalog]: Release tool schemas.

[^product-catalog]: Product maintenance tool schemas.

[^executor]: MCP adapters into shared persistence.

[^api]: REST validation, error mapping, and shared persistence adapters.

[^summary]: Compact readiness result.

[^skill]: External-agent reconciliation and evidence procedure.

[^guide]: Published connection and API workflow.
