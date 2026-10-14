---
type: Product scope
title: Roadmap authority
description: Locate adopted scope, published releases, and the remaining pilot work without duplicating release history.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-14
sources:
  - id: roadmap
    resource: "src/content/docs/roadmap.mdx"
  - id: readme
    resource: "README.md"
  - id: mvp
    resource: "src/content/docs/release-readiness-mvp.mdx"
  - id: journal
    resource: "src/content/docs/persona-iteration.mdx"
---

`src/content/docs/roadmap.mdx` owns adopted product scope. `src/content/docs/release-readiness-mvp.mdx` owns the MVP contract and acceptance criteria. `README.md` distinguishes the published baseline from unreleased work. Update those files when delivery state changes.[^roadmap]

The current repository describes `2026.8.0` as the published visual/team/agent baseline and the release-readiness MVP as implemented but unreleased. This is a repository statement, not an independently refreshed release-registry query.[^readme]

The MVP includes [capabilities, dependencies, assessments, and evidence](model.md), task-based review and role filters, ordinary AI maintenance through REST/MCP, human decisions, and curated public reviews. The [readiness rules](readiness.md) remain the acceptance boundary.[^mvp]

The real team pilot and external GitHub milestone reconciliation remain follow-up work. The persona iteration journal records simulated roles and local product use. Those observations do not replace independent human research or production verification.[^journal]

Later roadmap work covers additional evidence producers, catalog imports, freshness/context comparison, capability flows, broader impact navigation, portfolio assessments, and reusable templates. Capture automation, provider sync, S3 storage, and other former visual backlog items remain deferred according to the roadmap.[^roadmap]

[Knowledge maintenance](../engineering/knowledge-maintenance.md) assigns each changing fact one authoritative home. Keep detailed release history in the existing changelog instead of reproducing it here.

[^roadmap]: Adopted roadmap and its explicit external-reconciliation limit.

[^readme]: Published-versus-unreleased distinction in README.

[^mvp]: MVP implementation contract.

[^journal]: Persona iteration journal and research limits.
