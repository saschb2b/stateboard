---
type: Pattern
title: Release review workspace
description: A candidate review with linked screens, contextual checks and results, and a separate owner decision.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: docs/design-system/references/review-clarity-research.md
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: src/components/release/use-release-navigation.ts
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/release/workspace-frame.tsx
  - resource: src/components/release/workspace-navigation.tsx
  - resource: src/components/release/release-workspace.tsx
  - resource: src/components/release/assessment-create-form.tsx
  - resource: src/components/evidence/check-editor.tsx
  - resource: src/components/evidence/verification-method.tsx
  - resource: src/components/evidence/evidence-form.tsx
  - resource: src/components/capability/capability-visual-view.tsx
  - resource: src/components/release/release-perspectives.tsx
  - resource: docs/design-system/references/interface-research.md
  - resource: docs/design-system/references/product-overview-research.md
examples:
  - review-workspace.example.html
  - review-workspace.wireframe.html
---

# Structure

| Region          | Order and sizing                                              | Reflow                                                            |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| App bar         | Brand, linked ancestor trail, contextual actions              | Show the immediate parent link on mobile. Keep actions reachable. |
| View navigation | Overview, Checks, Decision in the 184px rail                  | Below 1200px, move beneath the heading as scrollable tabs.        |
| Heading         | Candidate title, target, revision, context disclosure         | Wrap the title. Keep secondary context in the disclosure.         |
| Overview        | Verdict, grouped findings, then scoped features in one column | Preserve the same order at every width.                           |
| Detail views    | Use the full reading surface                                  | Preserve the release and feature context when inspecting claims.  |

Use the [foundation spacing](../foundations/tokens.md): 24px between groups and 16px within rows. The reading surface has a maximum width of 1440px including navigation. Do not add statistical cards, greetings, charts, or progress gauges that lack a release-review purpose.

# Content and behavior

The verdict, validation context, target, and human decision precede feature scope. Group unresolved claims beneath the verdict in one list. Show the first three findings and disclose the rest through one **Show all** control when needed. Keep optional warnings in a separate disclosure. Avoid a second attention column or a duplicate **All findings** list.

Show each feature's name, owner, and own-check state in its collapsed row. Expansion reveals its retained outcome, scope reason, checks, and results. **Add check** keeps this feature selected and starts from its outcome. The claim remains editable. **Record result** stays beside the check. Supporting architecture and screens are available when they explain that feature. Attention rows state the claim, evidence state, and owner. Selecting one opens its evidence.

The primary destinations are **Overview**, **Checks**, and **Decision**. **Screens** and **Architecture** form secondary supporting context. Operational, security, and data concerns filter the same checks instead of creating another maintenance task. Use **Checks & results** as the check page heading.

Screens restores the feature filter from the review URL. Keep **Manage screens** visible after images exist and offer **Edit screen** beside each image. Editing preserves the release, selected feature, and chosen screen. Included feature names open their focused checks. Region notes and source references use a keyboard-accessible disclosure.

**Open full-size image** opens the original media separately and keeps the review in place. Wrap long image titles and actions at narrow widths. A linked feature outside the review shows **Not in release review**. Explicitly excluded scope shows **Excluded**. Neither state becomes **Needs evidence** through a missing lookup.

State that screens may show another product version. Feature links describe the interface. Applicable check results establish candidate readiness. An official reference image retains its source and unknown capture version. The [screen exercise](../references/review-clarity-research.md#screens-and-feature-links) records the distinction and the observed friction.

On mobile, put the supporting-context label and its tabs in one row below the primary tabs. On desktop, place the label above its tabs. Keep legacy view URLs functional. The [clarity study](../references/review-clarity-research.md) records the rationale.

Creating a check carries its known target, owner, and validation environment forward. Use the active category as its initial category, or operational in the Operations filter. Otherwise start with functional. Existing check revisions retain their category. Show the claim, verification method, and required/optional choice first. Disclose category, environment, and freshness settings with their current values visible.

Keep source URLs in a check's method directly accessible through the [link behavior](../behaviors/interaction.md#behavior). A documented feature can define a check, but requires an applicable observation to establish readiness.

Manual result entry starts with result and observation, with an optional supporting link. Source and observation time remain inspectable and editable. Generate a unique manual review reference on submission and retain the retry identity after an error. Never preselect a passing result.

When creating another release review, reuse the latest review's environments, audience, and configuration as visible, editable defaults. Capture that source context when the dialog opens and retain it while editing. Name that source review and summarize the values above the disclosure. Keep the new candidate name/reference empty and feature selection visible. For the first review, show all required context fields. Never copy checks or observations as proof for a new candidate.

Provide a visible **Cancel** action in the creation dialog and restore focus on dismissal. The [real-product exercise](../references/review-clarity-research.md#real-product-use) identified this exit and source-link friction during actual board maintenance.

In Architecture, show scoped checks after the reviewer selects a feature or component. Keep release-wide requirements visible within that scope. Do not repeat all checks beneath the initial architecture catalog.

The [controls](../components/controls.md) retain readable labels. The [interaction rules](../behaviors/interaction.md) define keyboard behavior and context retention. The [overview research](../references/product-overview-research.md) informs the shared reading flow. The [product overview](product-overview.md) includes the full active catalog. This assessment view stays within its recorded scope.

Hide check search when the current scope has at most three checks and no query. Keep it visible for larger scopes or an active query. Put **Include functional checks** inside **More filters** in the Operations area.

Assessment tabs identify their panel through `aria-controls`. The current focusable panel identifies its selected tab through `aria-labelledby`. Category deep links open filtered checks with a visible category chip. Clearing that filter preserves the exact-check parameter, unrelated query parameters, and the URL fragment. Filters change the displayed checks, never readiness.

The header trail exposes **Boards**, the named board, **Release reviews**, and the current candidate. Parent items are links. The current candidate is plain text. At narrow widths, retain the immediate parent link and show the candidate in the page heading. The [wayfinding study](../references/ux-navigation-research.md) explains this hierarchy and its separation from review tasks and supporting context.

Opening a finding changes its view, check, and capability focus in one history entry. Back, Forward, and reload restore the URL's view, check, category, capability, and component. Search, result, and needs-attention filters remain local to each view. Keep unrelated query parameters and the fragment. Do not create intermediate history entries that show a new view with an old check.

# Examples

The [rendered example](review-workspace.example.html) uses illustrative data from the local StateBoard review. It is a design specimen, not a current assessment or verification result. The [wireframe](review-workspace.wireframe.html) keeps its body identical and strips the skin. Review both at 390px and 1440px.
