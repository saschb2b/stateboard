---
type: Pattern
title: Product overview
description: One release review summary followed by product screens, features, and check coverage, with architecture as optional context.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: src/components/release/product-screens.tsx
  - resource: docs/design-system/references/review-clarity-research.md
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/release/product-workspace.tsx
  - resource: src/components/capability/capability-manager.tsx
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: docs/design-system/references/product-overview-research.md
  - resource: docs/product/model.md
  - resource: docs/product/readiness.md
  - resource: src/components/release/product-overview.tsx
  - resource: src/components/release/product-overview-capabilities.tsx
  - resource: src/components/release/product-overview-coverage.tsx
  - resource: src/components/release/use-product-section.ts
  - resource: src/components/release/use-workspace-refresh.ts
examples:
  - product-overview.example.html
  - product-overview.wireframe.html
---

# Structure

The product overview answers what the product contains, which candidate the checks cover, and where its assessment still lacks proof. It uses one vertical reading flow.

| Region                | Order and content                                                                                                    | Reflow                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Product heading       | Product name, short purpose, Edit board for editors, History and Refresh actions                                     | Below 900px, place the wrapping action row beneath the purpose. |
| Navigation            | Existing 184px rail for product sections, with Overview selected                                                     | Below 1200px, show horizontal navigation beneath the heading.   |
| Latest release review | Candidate, derived conclusion, validation environment and release target, separate human decision, one review action | Stack properties in their desktop reading order.                |
| Findings              | A labelled disclosure inside the assessment band                                                                     | Expand beneath the band without opening another column.         |
| Product screens       | Up to three image previews with names, region counts, and a link to all screens                                      | Stack previews at narrow widths without shrinking their labels. |
| Product features      | Full-width aligned rows: capability and owner, own-check state, declared mappings                                    | Below 900px, stack the fields within each expandable row.       |
| Verification coverage | Six compact rows: functionality, integration, user experience, data, security, operations                            | Below 600px, stack the description beneath its discipline.      |
| Product connections   | Quiet component, dependency, and mapped-screen counts below verification coverage                                    | Wrap links while retaining their full labels.                   |

Use [foundation tokens](../foundations/tokens.md) for the shell, surfaces, spacing, and typography. Leave 24px between sections. Repeated rows use quieter typography than the candidate conclusion. The [research study](../references/product-overview-research.md) explains the aligned-row direction and rejected dashboard patterns.

# Content and behavior

Show every active capability, including excluded and unassessed capabilities. Identify definitions newer than the latest assessment. A current catalog row must not imply that an older assessment covers its new definition. Retain that distinction when filtering or opening details.

Label per-capability results as own checks. They do not include every dependency's readiness. Show declared component and screen mappings as counts or readable links. A declared mapping does not establish working behavior or production availability. Screenshots remain optional.

Separate calculated readiness from an owner's decision. An assessment with missing evidence must retain that conclusion even when a decision exists. Label the assessment as latest, and expose its candidate, validation environment, and target. Finding disclosure states the unresolved claim and evidence condition. Its review route preserves the relevant assessment context.

The six coverage rows describe the latest assessment's acceptance checks. Show no checks, optional-only coverage, unknown coverage, and required gaps explicitly. Category counts do not establish full domain coverage. A missing security check does not mean security passed. Category links open Checks & results with `view=qa` and the matching `category` value.

Checks & results keeps a visible category chip outside its collapsed filters. Clearing the chip or resetting filters also removes the category from the URL.

Keep **Edit board** beside the product identity as the single editing entry point for members with editing permission. Group **History** and Refresh beside **Edit board** in the heading. Keep the section navigation for product views. Viewers retain History and Refresh. Returning from either page uses the board's named parent link. The [wayfinding study](../references/ux-navigation-research.md) supports visible editing and a linked hierarchy without adding another dashboard region.

Product sections use stable URLs. Overview is the default. The other `section` values are `screens`, `releases`, `capabilities`, `dependencies`, and `connections`. The primary labels are **Overview**, **Screens**, **Features**, and **Release reviews**, in that order. **Architecture** combines components and their relationships as optional supporting context. Legacy `dependencies` and `connections` URLs remain valid. Do not duplicate Screens as a utility action in the app header.

Screens belongs to the product and works without a release review. The overview shows up to three existing screen previews after the latest review. Each opens that image for inspection or editing. **View all screens** opens the product gallery, which uses the same screen records and preserves their order. Keep image names, annotation counts, and linked-feature counts visible. Compact previews scroll within their own row below 900px, leaving the following feature list within reach. Do not add readiness metrics or another manual screen catalog.

The gallery exposes screen creation for editors and direct inspection for readers. An empty gallery explains how to add the first screen. Screens remain optional for readiness, while their primary navigation entry makes existing visual context easy to find. The [editor and navigation research](../references/product-overview-research.md#screens-as-a-product-destination) records this design choice.

Section changes preserve unrelated query parameters and the fragment. Browser Back restores the previous section. Each selected tab controls a labelled, focusable tab panel.

Keep the overview current after external agents change its records. Use the [live-workspace refresh behavior](../behaviors/interaction.md#behavior), deferring read refreshes while forms remain open. Refresh the visible workspace after the last form closes, retaining the selected section. Retain manual Refresh beside the board actions.

Expand a capability row to inspect its outcome, scope reason, and definition changes. Keep the candidate limitation beside its check result. Show archived capabilities when the assessment still includes them. Product connection counts describe declared architecture. Mark a truncated graph as partial instead of presenting its counts as complete.

The **Features** section explains what users should be able to do. Each feature holds an expandable area for supporting systems and screen regions. Linking from that area fixes the feature context, so the reviewer selects only the related record and any needed explanation. Do not require a complete architecture map before starting a release review. The [clarity study](../references/review-clarity-research.md) explains this reduction in manual linking.

Use one route to the full release review. Keep forms, revision history, and full dependency detail outside the default overview. Follow the [interaction rules](../behaviors/interaction.md) for focus, labels, and context retention.

# Examples and checks

The [example](product-overview.example.html) contains three illustrative screen previews, six StateBoard capabilities, and two evidence gaps: a restore drill and independent human review. It includes one excluded capability and one unassessed definition. The values are a design specimen, not the live product's current assessment.

The [wireframe](product-overview.wireframe.html) has the same body and structural CSS. Review it before the styled example at 390px, 900px, and 1440px. Check keyboard expansion, category links, visible filter reset, long names, and the distinction between check status and the human decision. Test the implementation with empty and populated assessments, expired evidence, URL reload, and browser Back.

The specimen shows overview content, compact screen previews, and disclosure. The specimen labels its screen thumbnails as illustrations. They provide no observed product evidence. The running product owns full section navigation and filtered assessment views. Specimen management links open the [supporting screen contract](supporting-surfaces.md#board-details-and-return-paths). They do not edit product records.
