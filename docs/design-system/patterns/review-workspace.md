---
type: Pattern
title: Release review workspace
description: One candidate heading, a compact assessment summary, and scoped capability rows in one reading flow.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: src/components/release/use-release-navigation.ts
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/release/workspace-frame.tsx
  - resource: src/components/release/workspace-navigation.tsx
  - resource: src/components/release/release-workspace.tsx
  - resource: docs/design-system/references/interface-research.md
  - resource: docs/design-system/references/product-overview-research.md
examples:
  - review-workspace.example.html
  - review-workspace.wireframe.html
---

# Structure

| Region          | Order and sizing                                                  | Reflow                                                                 |
| --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| App bar         | Brand, linked ancestor trail, contextual actions                  | Show the immediate parent link on mobile. Keep actions reachable.      |
| View navigation | 184px rail beside the reading surface                             | Below 1200px, move beneath the heading as scrollable tabs.             |
| Heading         | Candidate title, target, revision, context disclosure             | Wrap the title. Keep secondary context in the disclosure.              |
| Overview        | Verdict, grouped findings, then scoped capabilities in one column | Preserve the same order at every width.                                |
| Detail views    | Use the full reading surface                                      | Preserve the assessment and capability context when inspecting claims. |

Use the [foundation spacing](../foundations/tokens.md): 24px between groups and 16px within rows. The reading surface has a maximum width of 1440px including navigation. Do not add statistical cards, greetings, charts, or progress gauges that lack a release-review purpose.

# Content and behavior

The verdict, validation context, target, and human decision precede capability scope. Group unresolved claims beneath the verdict in one list. Show the first three findings and disclose the rest through one **Show all** control when needed. Keep optional warnings in a separate disclosure. Avoid a second attention column or a duplicate **All findings** list.

Show each capability's name, owner, and own-check state in its collapsed row. Expansion reveals its outcome, scope reason, and routes to architecture or acceptance checks. Attention rows state the claim, evidence state, and owner. Selecting one opens its evidence.

The [controls](../components/controls.md) retain readable labels. The [interaction rules](../behaviors/interaction.md) define keyboard behavior and context retention. The [overview research](../references/product-overview-research.md) informs the shared reading flow. The [product overview](product-overview.md) includes the full active catalog. This assessment view stays within its recorded scope.

Assessment tabs identify their panel through `aria-controls`. The current focusable panel identifies its selected tab through `aria-labelledby`. Category deep links open filtered checks with a visible category chip. Clearing that filter preserves the exact-check parameter, unrelated query parameters, and the URL fragment. Filters change the displayed checks, never readiness.

The header trail exposes **Boards**, the named board, **Assessments**, and the current candidate. Parent items are links. The current candidate is plain text. At narrow widths, retain the immediate parent link and show the candidate in the page heading. The [wayfinding study](../references/ux-navigation-research.md) explains this hierarchy and its separation from assessment perspectives.

Opening a finding changes its view, check, and capability focus in one history entry. Back, Forward, and reload restore the URL's view, check, category, capability, and component. Search, result, and needs-attention filters remain local to each view. Keep unrelated query parameters and the fragment. Do not create intermediate history entries that show a new view with an old check.

# Examples

The [rendered example](review-workspace.example.html) uses illustrative data from the local StateBoard review. It is a design specimen, not a current assessment or verification result. The [wireframe](review-workspace.wireframe.html) keeps its body identical and strips the skin. Review both at 390px and 1440px.
