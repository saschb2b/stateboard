---
type: Maintenance procedure
title: Knowledge maintenance
description: Update instructions, knowledge, design, and published guides with the behavior they describe.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-14
sources:
  - id: request
    resource: "User request on 2026-10-13: central root docs, a cohesive design system, and same-change synchronization."
  - id: okf
    resource: ".agents/skills/okf/SKILL.md"
  - id: odsf
    resource: ".agents/skills/odsf/SKILL.md"
  - id: agents
    resource: "AGENTS.md"
  - id: package
    resource: "package.json"
  - id: skill-sources
    resource: ".agents/skills/sources.json"
  - id: locale-catalogs
    resource: "src/i18n/catalog.ts"
  - id: browser-config
    resource: "agent-browser.json"
---

Keep instructions, knowledge, design, and implementation consistent in the same change. This bundle is the central repository knowledge base. It explains how to work on StateBoard and points to the files that own executable behavior and published contracts.[^request]

| Fact or rule                                                | Authoritative home                                | Update alongside it                                                              |
| ----------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Agent work loop, non-negotiable boundaries, skill selection | `AGENTS.md`                                       | Affected knowledge concepts. Keep `CLAUDE.md` as `@AGENTS.md`.                   |
| Product invariants and acceptance cases                     | `src/content/docs/release-readiness-mvp.mdx`      | Product concepts, implementation, tests, and usage guide.                        |
| Adopted product scope and release state                     | `src/content/docs/roadmap.mdx`, README, changelog | Roadmap concept and any affected agent instructions.                             |
| API schemas, access, persistence, readiness                 | Source modules and migrations                     | Architecture/product concepts, published guides, packaged skill, and tests.      |
| Design tokens, components, interaction rules                | `docs/design-system/`                             | Generated tokens, MUI theme, component implementations, and stories.             |
| Interface messages and technical translations               | `src/i18n/messages/`                              | Both languages, localization glossary, component stories, and interaction rules. |
| Commands, dependencies, checks                              | `package.json`, lockfile, CI                      | Development/verification concepts, README commands, and AGENTS gates.            |
| External-agent maintenance procedure                        | `skills/stateboard/SKILL.md`                      | API guide, MCP instructions/catalog, and workflow tests.                         |
| Upstream repository skills                                  | `.agents/skills/`                                 | AGENTS links and skill provenance when an upstream bundle changes.               |

`src/content/docs/` remains the published human usage and hosting documentation. This bundle explains engineering relationships without copying those guides in full. Avoid adding a second authoritative API schema or release history here.

Keep vendored skill files unchanged and record their upstream repository, revision, and hashes in `.agents/skills/sources.json`. A skill's repository and revision override the manifest defaults.[^skill-sources] Preserve each source's license. Update its AGENTS link and Git allowlist with the installed files.

Agent Browser's checked-in skill discovers workflows from the pinned CLI. Update the dependency and discovery skill together after reviewing upstream changes.[^package]

Keep project defaults in `agent-browser.json` and browser work artifacts under ignored `.agents/browser/`.[^browser-config] Refresh [local development](local-development.md) and [verification](verification.md) when its setup or work loop changes.

English and German catalogs are a paired source. Follow [interface localization](localization.md) when interface wording, formatting, or locale behavior changes. Keep machine identifiers and authored product records outside translation catalogs.[^locale-catalogs]

## Update procedure

1. Read the concepts and authoritative sources affected by the requested change.
2. Update implementation and tests with the relevant contracts and user-facing guidance.
3. Refresh each meaningfully changed concept's `generated.by` and `generated.at`.
4. Remove any `verified` event that no longer covers the revised content.
5. Update source metadata, cross-links, and affected index descriptions.
6. Append one dated entry per coherent change to the relevant `log.md`. Preserve older entries.
7. Generate changed design tokens, then run `pnpm docs:check` and the [verification gates](verification.md).
8. Review the diff for claims that exceed the observed evidence before committing.

Record the actual authoring agent in `generated.by`. Omit `verified` unless that confirmation occurred. A conformance check proves document structure, not factual accuracy or human review.[^okf]

Keep concept identities stable. Link related concepts directly, with the relationship named in prose. Indexes provide navigation but do not replace concept-to-concept links. If a concept moves, repair its inbound links and validate again.[^okf]

## Source inventory and coverage

The initial bundle reads the repository's operating manual, README, published readiness/API/roadmap contracts, package/CI configuration, and the source boundaries listed in concept frontmatter. Product concepts cover purpose, records, calculation, and scope. Architecture concepts cover runtime, access, persistence, and agent adapters. Engineering concepts cover local work and verification. The [design system](../design-system/overview.md) owns visual rules and research provenance.

Detailed endpoint inventories remain in discoverable tool schemas and the published API guide. Historical release notes remain in the changelog. Per-component examples remain in Storybook. This bundle references those sources because their executable or published owners already serve those reader jobs.

The knowledge check should catch broken links, missing source files, stale index descriptions, untracked skill files, and token-generation drift. Human or agent review must still reconcile semantics against code. The [agent API workflow](../architecture/agent-api.md) has the same distinction between declared context and observed evidence.

[^request]: Explicit user direction for this repository's knowledge and design upkeep.

[^okf]: OKF provenance, linking, freshness, and append-only log rules.

[^odsf]: Design bundle validation and generated-token maintenance.

[^agents]: Canonical repository work instructions.

[^package]: Repository validation and generation commands.

[^skill-sources]: Pinned upstream sources, per-skill overrides, and file hashes.

[^browser-config]: Shared browser defaults without machine settings or credentials.

[^locale-catalogs]: Typed English and German message namespaces.
