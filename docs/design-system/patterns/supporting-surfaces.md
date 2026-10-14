---
type: Guideline
title: Supporting screen contracts
description: Layout and interaction requirements for boards, screen annotations, feature links, settings, sharing, and presentation.
status: draft
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: docs/design-system/references/product-overview-research.md
  - resource: src/components/screen/screen-editor-toolbar.tsx
  - resource: src/components/release/product-screens.tsx
  - resource: docs/design-system/references/review-clarity-research.md
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
  - resource: src/components/capability/capability-visual-view.tsx
  - resource: src/components/screen/region-feature-links.tsx
  - resource: src/components/screen/screen-sidebar.tsx
  - resource: src/components/screen/screen-annotator.tsx
  - resource: src/components/screen/add-screen-dialog.tsx
  - resource: src/lib/screen-editor-context.ts
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

In the editor, use 4% state-color fill for unselected regions and 12% for the selected region. Selection and keyboard focus use the theme's primary outline. Labels use caption typography. Selectable regions are buttons with selected state and Enter/Space activation. Return focus to the canvas for arrow-key editing. Public and read-only overlays retain their existing fill behavior.

# Visual editor

The screen toolbar wraps its named controls at narrow widths. Find opens search. Filter retains the selected visual states. Keep these tools separate from the global board menu. The screen rail starts collapsed below 600px. **Expand screens** reveals its names and controls. Change that choice only through an explicit rail action while the editor stays open.

The editor's **More board options** menu exposes **Edit board** to members with editing permission. The empty state also exposes this action. Both open name and description settings. The board breadcrumb links to the overview and does not rename the board.

Screens is a primary product destination. Its gallery uses the existing screen records and opens each image in the editor. The editor breadcrumb follows Product → Screens → Screen editor. When opened from a release, a separate **Back to release review** action retains that review and selected feature. A release is contextual history, not the screen's parent. The release workspace retains **Manage screens** with existing images and exposes **Edit screen** for each image.

Give the canvas a header with the full selected screen name, region count, and short annotation hint. Keep Find, Filter, Present, and Share screens together in this toolbar. The global header retains board options and user/language controls. The rail shows accessible thumbnail buttons, names over up to two lines, and region counts. Keep the active screen visible through the shared selected treatment. Retain the existing charcoal surfaces and orange action color.

The inspector orders region name, visual state, linked features, then notes. The selected region exposes **Features shown here**, existing links, and controls to link or unlink a feature. Put the originating feature first when it remains available. Keep linking inside the inspector and show pending or failed saves there. Viewers can read the mappings. Editing requires the existing product permissions.

Limit the notes field to six visible rows with internal scrolling, so long source text does not bury feature links. Keep **Delete region** under the region's options, separate from ordinary edits.

At narrow widths, stack the image above the inspector in normal flow. Preserve the image's natural aspect ratio and prevent tall details from shrinking its canvas to zero height. Keep the side-by-side inspector on desktop.

At each gesture start, retain the inspector's visible state, including an unsaved draft. Keep the image layout stable during drawing, moving, and resizing, then update after pointer release. Global region shortcuts ignore handled events and interactive controls, including the feature picker. Screen Actions → Rename waits for the menu to close before focusing the name input. Upload and image reuse always offer **Cancel**. Prevent dismissal and tab changes while saving.

Source notes belong to the annotated region and remain accessible through keyboard and touch. Preserve the authored source, capture context, and unknowns. A vendor image or an older screenshot may explain a feature without establishing a result for the current candidate. The [screen exercise](../references/review-clarity-research.md#screens-and-feature-links) records the evidence boundary and the linking friction.

# Board details and return paths

The board list and product heading expose **Edit board** to members with editing permission. The action opens the existing board settings. Use one editing entry point per screen. **History** sits with the board actions beside **Edit board** in the product heading. Keep the board name in the breadcrumb as a link to its product overview. Breadcrumbs on a release review also expose **Release reviews**, its parent list. The [wayfinding study](../references/ux-navigation-research.md) records the design rationale.

Settings group the board name and description in one form. Use explicit **Save changes** and **Discard changes** controls. Disable them while saving and when the form has no changes. Keep unsaved values when switching settings sections. A failed request retains the draft and shows the error beside the form. Confirm a successful save with an announced status, and update the board identity from the saved response.

Separate deletion from ordinary edits. A rename keeps the board ID and public tokens unchanged. Preserve the existing role restrictions and deletion rules.

# Scope of this document

This matrix is an implementation contract, not a completed test record. Colocated stories and browser checks must establish behavior for the changed version. A screenshot alone cannot establish focus containment, authorization, or confidentiality.

Use the [review workspace](review-workspace.md) for assessment navigation and the [landing pattern](product-landing.md) for the public introduction. Shared styling must preserve each screen's data, permissions, and meaning.
