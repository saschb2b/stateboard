---
type: Design System
title: StateBoard review workspace
description: A compact review interface that keeps the release conclusion and supporting evidence in view.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/release/release-workspace.tsx
  - resource: docs/design-system/references/interface-research.md
  - resource: src/app/(site)/page.tsx
  - resource: docs/design-system/references/landing-research.md
  - resource: docs/design-system/patterns/product-overview.md
  - resource: docs/design-system/references/product-overview-research.md
---

# Use the system

StateBoard helps a reviewer judge a candidate, find uncertainty, and inspect the supporting claim. The interface starts with that task. [Research](references/interface-research.md) informed the hierarchy and disclosure. It does not establish usability results.

Read the [workspace pattern](patterns/review-workspace.md), then the [tokens](foundations/tokens.md) and [interaction rules](behaviors/interaction.md). The [example](patterns/review-workspace.example.html) composes the system. Its [wireframe](patterns/review-workspace.wireframe.html) uses the same markup to expose structure.

The [product overview](patterns/product-overview.md) uses one reading flow: latest assessment, active capabilities, and check coverage. Its [example](patterns/product-overview.example.html) and [wireframe](patterns/product-overview.wireframe.html) include excluded scope and missing coverage. The [overview study](references/product-overview-research.md) records seven inspected Dribbble compositions and supporting hierarchy guidance.

The [landing pattern](patterns/product-landing.md) introduces the product through an illustrative assessment, role routes, and agent maintenance. Its [example](patterns/product-landing.example.html) and [wireframe](patterns/product-landing.wireframe.html) share one body. The [landing study](references/landing-research.md) records seven inspected Dribbble concepts and two first-party page references.

The [supporting screen contracts](patterns/supporting-surfaces.md) cover boards, settings, signed reviews, visual sharing, and presentation. They identify the behavior to check without claiming a completed test run.

The [wayfinding study](references/ux-navigation-research.md) informs linked board hierarchy, visible editing, and explicit save feedback across these surfaces.

# Apply it

Use one heading per page, stable view navigation, and aligned rows. Expand outcomes, evidence history, and candidate context when needed. Use labels alongside status colors. Keep production availability distinct from candidate verification.

English and German share the same reading order and interaction model. Follow the [language behavior](behaviors/interaction.md#interface-language) and [technical glossary](../engineering/localization.md#technical-glossary). Translations must preserve readiness meanings and allow longer labels to wrap.

MUI components consume the generated design tokens through `src/lib/theme.ts`. The foundation frontmatter owns the values. Generate the TypeScript and CSS projections together. Do not add a second palette to a component or copy values from a screenshot.

The [product readiness contract](../product/readiness.md) determines the state. Design changes may improve presentation but cannot change that contract. The [knowledge maintenance procedure](../engineering/knowledge-maintenance.md) keeps concepts, examples, code, and checks current in the same change.
