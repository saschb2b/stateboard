---
type: Pattern
title: Release review workspace
description: Stable navigation, one candidate heading, and grouped evidence and capability rows.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-13 }
sources:
  - resource: src/components/release/workspace-frame.tsx
  - resource: src/components/release/workspace-navigation.tsx
  - resource: src/components/release/release-workspace.tsx
  - resource: docs/design-system/references/interface-research.md
examples:
  - review-workspace.example.html
  - review-workspace.wireframe.html
---

# Structure

| Region          | Order and sizing                                      | Reflow                                                                 |
| --------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| App bar         | Brand, product breadcrumb, contextual actions         | Truncate the breadcrumb while keeping actions reachable.               |
| View navigation | 184px rail beside the reading surface                 | Below 1200px, move beneath the heading as scrollable tabs.             |
| Heading         | Candidate title, target, revision, context disclosure | Wrap the title. Keep secondary context in the disclosure.              |
| Overview        | Verdict and attention rows beside scoped capabilities | Below 900px, stack verdict and findings before capabilities.           |
| Detail views    | Use the full reading surface                          | Preserve the assessment and capability context when inspecting claims. |

Use the [foundation spacing](../foundations/tokens.md): 24px between groups and 16px within rows. The reading surface has a maximum width of 1440px including navigation. Do not add statistical cards, greetings, charts, or progress gauges that lack a release-review purpose.

# Content and behavior

Show each capability's name, owner, and check state in its collapsed row. Expansion reveals its outcome, scope reason, and routes to architecture or acceptance checks. Attention rows state the claim, evidence state, and owner. Selecting one opens its evidence.

The [controls](../components/controls.md) retain readable labels. The [interaction rules](../behaviors/interaction.md) define keyboard behavior and context retention. This hierarchy adapts the [research findings](../references/interface-research.md) to StateBoard's readiness model.

# Examples

The [rendered example](review-workspace.example.html) uses illustrative data from the local StateBoard review. It is a design specimen, not a current assessment or verification result. The [wireframe](review-workspace.wireframe.html) keeps its body identical and strips the skin. Review both at 390px and 1440px.
