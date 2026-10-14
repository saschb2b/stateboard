---
type: Pattern
title: Product overview
description: One assessment summary followed by the active capability catalog and check coverage by discipline.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/release/product-workspace.tsx
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: docs/design-system/references/product-overview-research.md
  - resource: docs/product/model.md
  - resource: docs/product/readiness.md
  - resource: src/components/release/product-overview.tsx
  - resource: src/components/release/product-overview-capabilities.tsx
  - resource: src/components/release/product-overview-coverage.tsx
  - resource: src/components/release/use-product-section.ts
examples:
  - product-overview.example.html
  - product-overview.wireframe.html
---

# Structure

The product overview answers what the product contains, which candidate the checks cover, and where its assessment still lacks proof. It uses one vertical reading flow.

| Region                | Order and content                                                                                                    | Reflow                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Product heading       | Product name, short purpose, visible Edit board action for editors                                                   | Keep the heading first and wrap the purpose.                  |
| Navigation            | Existing 184px rail with Overview selected and History as a tool                                                     | Below 1200px, show horizontal navigation beneath the heading. |
| Latest assessment     | Candidate, derived conclusion, validation environment and release target, separate human decision, one review action | Stack properties in their desktop reading order.              |
| Findings              | A labelled disclosure inside the assessment band                                                                     | Expand beneath the band without opening another column.       |
| Active capabilities   | Full-width aligned rows: capability and owner, own-check state, declared mappings                                    | Below 900px, stack the fields within each expandable row.     |
| Verification coverage | Six compact rows: functionality, integration, user experience, data, security, operations                            | Below 600px, stack the description beneath its discipline.    |
| Product connections   | Quiet component, dependency, and mapped-screen counts below verification coverage                                    | Wrap links while retaining their full labels.                 |

Use [foundation tokens](../foundations/tokens.md) for the shell, surfaces, spacing, and typography. Leave 24px between sections. Repeated rows use quieter typography than the candidate conclusion. The [research study](../references/product-overview-research.md) explains the aligned-row direction and rejected dashboard patterns.

# Content and behavior

Show every active capability, including excluded and unassessed capabilities. Identify definitions newer than the latest assessment. A current catalog row must not imply that an older assessment covers its new definition. Retain that distinction when filtering or opening details.

Label per-capability results as own checks. They do not include every dependency's readiness. Show declared component and screen mappings as counts or readable links. A declared mapping does not establish working behavior or production availability. Screenshots remain optional.

Separate calculated readiness from an owner's decision. An assessment with missing evidence must retain that conclusion even when a decision exists. Label the assessment as latest, and expose its candidate, validation environment, and target. Finding disclosure states the unresolved claim and evidence condition. Its review route preserves the relevant assessment context.

The six coverage rows describe the latest assessment's acceptance checks. Show no checks, optional-only coverage, unknown coverage, and required gaps explicitly. Category counts do not establish full domain coverage. A missing security check does not mean security passed. Category links open QA with `view=qa` and the matching `category` value.

QA keeps a visible category chip outside its collapsed filters. Clearing the chip or resetting filters also removes the category from the URL.

Keep **Edit board** beside the product identity for members with editing permission. It opens name and description settings. Use this single entry point for board editing on the product screen. Keep **History** in the product tools. Returning from either page uses the board's named parent link. The [wayfinding study](../references/ux-navigation-research.md) supports visible editing and a linked hierarchy without adding another dashboard region.

Product sections use stable URLs. Overview is the default. The other `section` values are `releases`, `capabilities`, `dependencies`, and `connections`. They correspond to Assessments, Capabilities, Components, and Connections.

Section changes preserve unrelated query parameters and the fragment. Browser Back restores the previous section. Each selected tab controls a labelled, focusable tab panel.

Expand a capability row to inspect its outcome, scope reason, and definition changes. Keep the candidate limitation beside its check result. Show archived capabilities when the assessment still includes them. Product connection counts describe declared architecture. Mark a truncated graph as partial instead of presenting its counts as complete.

Use one route to the full assessment. Keep forms, revision history, and full dependency detail outside the default overview. Follow the [interaction rules](../behaviors/interaction.md) for focus, labels, and context retention.

# Examples and checks

The [example](product-overview.example.html) contains six illustrative StateBoard capabilities and two evidence gaps: a restore drill and independent human review. It includes one excluded capability and one unassessed definition. The values are a design specimen, not the live product's current assessment.

The [wireframe](product-overview.wireframe.html) has the same body and structural CSS. Review it before the styled example at 390px, 900px, and 1440px. Check keyboard expansion, category links, visible filter reset, long names, and the distinction between check status and the human decision. Test the implementation with empty and populated assessments, expired evidence, URL reload, and browser Back.

The specimen shows overview content and disclosure. The running product owns full section navigation and filtered assessment views. Specimen management links open the [supporting screen contract](supporting-surfaces.md#board-details-and-return-paths). They do not edit product records.
