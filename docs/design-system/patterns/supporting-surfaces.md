---
type: Guideline
title: Supporting screen contracts
description: Layout and interaction requirements for boards, settings, sharing, and presentation.
status: draft
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: src/components/board/board-editor.tsx
  - resource: src/components/board/board-list.tsx
  - resource: src/components/board/board-settings.tsx
  - resource: src/components/workspace/settings-frame.tsx
  - resource: src/components/workspace/audit-log.tsx
  - resource: src/components/workspace/member-roster.tsx
  - resource: src/components/workspace/api-key-manager.tsx
  - resource: src/components/auth/sign-in-panel.tsx
  - resource: src/components/release/public-release-share.tsx
  - resource: src/components/board/board-share.tsx
  - resource: src/components/board/present-mode.tsx
  - resource: src/components/region/region-overlay.tsx
---

# Screen contracts

Supporting screens use the [shared tokens](../foundations/tokens.md), [controls](../components/controls.md), and [interaction rules](../behaviors/interaction.md). Keep one page title and compact groups. The table specifies each surface's contract and the behavior to verify when it changes.

| Surface            | Layout and content contract                                                                                                                       | Verification target                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Boards             | Group projects into aligned rows. Keep the board name, useful context, and opening action close together.                                         | Long titles, empty state, editor actions, and narrow layout.                                   |
| Board settings     | Separate general settings and sharing through stable local navigation. Keep destructive actions in a distinct section.                            | Selected destination, form labels, save errors, and deletion confirmation.                     |
| Workspace settings | Reuse one frame for members, API keys, and audit. Move side navigation into a scrollable row on narrow screens.                                   | Selected route, keyboard access, loading shell, and matching content heading.                  |
| Members            | Keep identity and role together. Wrap long names and email addresses without pushing controls outside the row.                                    | Long unbroken identity values and authorization-dependent actions.                             |
| API keys           | Separate key creation from the compact credential list. Show a newly issued secret only in its intended disclosure.                               | Creation, copy feedback, scopes, revocation, and absence of secret values from ordinary lists. |
| Audit              | Use a table with stable columns inside its own horizontal scroll container.                                                                       | Long actors and resource names, filters, empty state, and no page-wide overflow.               |
| Sign-in            | Use a short form with a clear primary action and contextual errors.                                                                               | Keyboard submission, provider availability, pending state, and return destination.             |
| Published review   | Lead with the signed decision and retained assessment context. Group capability outcomes into compact rows. State the historical limitation once. | Long names, semantic outcome labels, retained media, and absence of private fields.            |
| Visual viewer      | Keep the board title and view tabs visible before the screenshot. Connect regions to their details through labelled interaction.                  | Title wrapping, narrow tabs, zoom, keyboard region focus, and visual-state labels.             |
| Presenter          | Keep navigation and exit controls available. Contain focus while presentation is open and restore it on close.                                    | Escape, focus containment, focus return, long content, and control reachability.               |
| Region overlays    | Derive fills, borders, and focus treatment from theme/state tokens. Pair color with a state label.                                                | Theme changes, keyboard details, normalized positioning, and edit handles.                     |

On compact screenshots, hide region titles while retaining the state chip. A tap or keyboard focus reveals the full label and notes. Use an opaque theme surface for labels so screenshot colors cannot reduce their contrast.

# Visual editor

Keep desktop search in the header's normal layout so it cannot overlap the board identity or actions. As the header narrows, move search, visual-state filters, sharing, and Present into **More board options**. Preserve their labels and selected filter state. The screen rail starts collapsed below 600px. **Expand screens** reveals its names and controls, and the user's choice remains active while the editor stays open.

The editor's **More board options** menu exposes **Edit board** to members with editing permission. The empty state also exposes this action. Both open name and description settings. The board breadcrumb links to the overview and does not rename the board.

# Board details and return paths

The board list and product heading expose **Edit board** to members with editing permission. The action opens the existing board settings. Use one editing entry point per screen. **History** sits with the board actions beside **Edit board** in the product heading. Keep the board name in the breadcrumb as a link to its product overview. Breadcrumbs on a release review also expose **Release reviews**, its parent list. The [wayfinding study](../references/ux-navigation-research.md) records the design rationale.

Settings group the board name and description in one form. Use explicit **Save changes** and **Discard changes** controls. Disable them while saving and when the form has no changes. Keep unsaved values when switching settings sections. A failed request retains the draft and shows the error beside the form. Confirm a successful save with an announced status, and update the board identity from the saved response.

Separate deletion from ordinary edits. A rename keeps the board ID and public tokens unchanged. Preserve the existing role restrictions and deletion rules.

# Scope of this document

This matrix is an implementation contract, not a completed test record. Colocated stories and browser checks must establish behavior for the changed version. A screenshot alone cannot establish focus containment, authorization, or confidentiality.

Use the [review workspace](review-workspace.md) for assessment navigation and the [landing pattern](product-landing.md) for the public introduction. Shared styling must preserve each screen's data, permissions, and meaning.
