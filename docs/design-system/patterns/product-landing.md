---
type: Pattern
title: Product landing page
description: An editorial introduction, interactive assessment preview, role routes, and agent maintenance explanation.
status: draft
generated: { by: codex/gpt-6, at: 2026-10-13 }
sources:
  - resource: src/app/(site)/page.tsx
  - resource: src/components/site/release-preview.tsx
  - resource: src/components/site/site-link.tsx
  - resource: docs/design-system/references/landing-research.md
examples:
  - product-landing.example.html
  - product-landing.wireframe.html
---

# Structure

| Region                  | Order and sizing                                                                            | Reflow                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Header                  | Brand, agent information, documentation, workspace route                                    | Keep the workspace route reachable. Hide secondary navigation only when necessary. |
| Hero                    | Large release question on the left. Short explanation and primary action on the right.      | Stack heading, explanation, and actions below the medium breakpoint.               |
| Assessment preview      | One bordered frame. Candidate and verdict column beside Overview, Architecture, and Checks. | Move candidate context above tabs. Wrap rows and stack the dependency path.        |
| Role routes             | Section heading beside six compact linked rows                                              | Stack the heading above the rows. Each row retains its role and question.          |
| Agent maintenance       | Product explanation beside the upkeep sequence                                              | Stack the sequence below the explanation.                                          |
| Self-hosting and footer | Short deployment explanation, guide route, product links                                    | Wrap actions without hiding labels.                                                |

The preview keeps its candidate and readiness conclusion visible while tabs change. Overview and Checks each show three rows, with one unresolved restore drill. Architecture explains the declared path between the review UI, release API, and database.

The [example](product-landing.example.html) shows this structure. The [wireframe](product-landing.wireframe.html) uses the identical body with its skin removed. Review both at 390px and 1440px before changing the composition. The specimen's role links switch its local preview. The app's role links open the corresponding demo view.

# Tokens and content

Use [foundation tokens](../foundations/tokens.md) for both app and specimen. The `typography.landing` group owns display, section-heading, and lead sizes, including their responsive variants, weight, tracking, and leading. Use the shared canvas, surface, border, and primary colors. Spacing follows the existing scale, with larger page intervals composed from that scale.

The headline states the release question. Supporting text explains capabilities, dependencies, and evidence. The preview visibly identifies its records as illustrative. It must not imply a live candidate, independent customer validation, or a real release decision.

Label calculated readiness as verification status. An open required check prevents approval, while an owner may record hold at any time. Missing evidence means no matching observation. Failed and inconclusive observations remain evidence and must retain their actual outcomes.

Explain that agents and CI maintain records through REST or MCP in their own workflow. A connection does not start background maintenance. A human owner retains the release decision. Do not add customer logos, ratings, adoption counts, or performance claims without evidence specific to StateBoard.

# Interaction

Use named tabs with selected state, associated panels, and keyboard navigation. Keep the assessment tuple stable across tabs. Role links identify both the profession and the question its view answers. Route links use the shared [controls](../components/controls.md) and [focus rules](../behaviors/interaction.md).

The [landing research](../references/landing-research.md) supports the product-preview hierarchy and records rejected decorative patterns. The [supporting screen contracts](supporting-surfaces.md) carry this restraint into settings, sharing, and presentation.
