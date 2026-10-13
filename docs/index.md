---
okf_version: "0.2"
---

# StateBoard knowledge

Read the relevant branch before changing behavior. Source paths in concept metadata are repository-relative. Generated concepts report their author and source material without claiming human review.

- [Product](product/index.md): purpose, records, release readiness, and adopted scope.
- [Architecture](architecture/index.md): runtime, authorization, persistence, and AI maintenance.
- [Engineering](engineering/index.md): local setup, localization, verification, and knowledge maintenance.
- [Design system](design-system/index.md): the StateBoard review workspace, tokens, components, and interaction rules.

Start with [product purpose](product/purpose.md) when deciding whether a feature belongs. Use [verification](engineering/verification.md) to finish a code change and [knowledge maintenance](engineering/knowledge-maintenance.md) to keep its documentation current.

The root `AGENTS.md` is the operating entry point. Published user guides remain in `src/content/docs/`. This bundle records engineering knowledge and connects those sources without replacing their contracts.
