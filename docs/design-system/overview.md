---
type: Design System
title: StateBoard review workspace
description: A compact review interface that keeps the release conclusion and supporting evidence in view.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-13 }
sources:
  - resource: src/components/release/release-workspace.tsx
  - resource: docs/design-system/references/interface-research.md
---

# Use the system

StateBoard helps a reviewer judge a candidate, find uncertainty, and inspect the supporting claim. The interface starts with that task. [Research](references/interface-research.md) informed the hierarchy and disclosure. It does not establish usability results.

Read the [workspace pattern](patterns/review-workspace.md), then the [tokens](foundations/tokens.md) and [interaction rules](behaviors/interaction.md). The [example](patterns/review-workspace.example.html) composes the system. Its [wireframe](patterns/review-workspace.wireframe.html) uses the same markup to expose structure.

# Apply it

Use one heading per page, stable view navigation, and aligned rows. Expand outcomes, evidence history, and candidate context when needed. Use labels alongside status colors. Keep production availability distinct from candidate verification.

MUI components consume the generated design tokens through `src/lib/theme.ts`. The foundation frontmatter owns the values. Generate the TypeScript and CSS projections together. Do not add a second palette to a component or copy values from a screenshot.

The [product readiness contract](../product/readiness.md) determines the state. Design changes may improve presentation but cannot change that contract. The [knowledge maintenance procedure](../engineering/knowledge-maintenance.md) keeps concepts, examples, code, and checks current in the same change.
