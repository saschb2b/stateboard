---
type: Reference
title: Product overview research
description: Visual references and hierarchy guidance for a compact product state overview.
tags: [research, product-overview, hierarchy, release-readiness]
status: draft
generated: { by: codex/unversioned, at: 2026-10-13T22:20:11Z }
stale_after: 2027-01-14
sources:
  - id: nkemka
    resource: https://dribbble.com/shots/22616154-Project-Overview-Dashboard
    title: Project Overview Dashboard by Nkemka Humphrey
  - id: goran
    resource: https://dribbble.com/shots/3902750-Project-Overview-Project-management-dashboard
    title: Project Overview by Goran Tomičić
  - id: vitaldash
    resource: https://dribbble.com/shots/25890422-Meet-VitalDash-a-smart-dashboard-for-tracking-project-health
    title: VitalDash by Balveer Singh
  - id: jason
    resource: https://dribbble.com/shots/26898684-Project-Management-Dashboard-UI
    title: Project Management Dashboard UI by Jason D
  - id: opero
    resource: https://dribbble.com/shots/27708749-Opero-AI-AI-Workflow-Automation-SaaS-Product-Design
    title: Opero AI by Jatin Lathiya
  - id: oripio
    resource: https://dribbble.com/shots/27688891-Project-Management-Dashboard-Design
    title: Project Management Dashboard Design by Oripio Product
  - id: proxel
    resource: https://dribbble.com/shots/27042398-Project-List-View-Project-Management-Dashboard
    title: Project List View by Abu. M
  - id: hierarchy
    resource: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
    title: Visual Hierarchy in UX by Kelley Gordon
  - id: disclosure
    resource: https://www.nngroup.com/articles/progressive-disclosure/
    title: Progressive Disclosure by Jakob Nielsen
  - id: proposal
    resource: Agent-authored interpretation for StateBoard's product overview, 2026-10-14
  - id: existing-pattern
    resource: docs/design-system/patterns/review-workspace.md
  - id: purpose
    resource: docs/product/purpose.md
---

# Product state in one reading flow

The research question is how one product overview can expose readiness, coverage, and uncertainty without making every fact compete for attention. The proposed order is product identity, candidate conclusion, product coverage, then supporting detail.[^proposal]

Use one aligned capability list as the main reading surface. Qualify the candidate result as each capability's own checks. Show declared component and screen mappings without implying production availability. Keep unresolved claims in the assessment band, with links to their affected capabilities. Expose represented disciplines and missing coverage without converting counts into a readiness score.[^proposal]

At the recorded baseline, the [workspace pattern](../patterns/review-workspace.md) put verdict and attention rows beside capabilities. The revised pattern uses a shared vertical reading flow. That changes layout, not the [product purpose](../../product/purpose.md) or readiness rules.[^existing-pattern][^purpose]

# Visual comparison

These are observations of published images, followed by StateBoard interpretations. This study treats designer claims about speed, usability, and real-time behavior as unverified.

| Reference                 | Visible structure                                                                                                                                                        | Adopt or reject for StateBoard                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nkemka Humphrey[^nkemka]  | A tall project-details card sits beside stage, completion-rate, people, quick-action, and activity cards. Stage progress appears twice.                                  | Retain product context. Reject repeated state and equal-weight card columns, which create several competing starting points.                                                                   |
| Goran Tomičić[^goran]     | A project heading precedes task rings, a calendar, milestones, a large bar chart, team scores, and a tall activity feed.                                                 | Retain the clear project heading. Reject the chart collection and separate activity column for a release decision.                                                                             |
| VitalDash[^vitaldash]     | Project metadata and a health chart sit above a full-width risk table. Risk factor, description, status, and remarks retain consistent columns.                          | Adapt the aligned diagnostic rows. Replace manually chosen health colors with derived, labelled assessment states. Omit the trend chart without comparable observations.                       |
| Jason D[^jason]           | Quiet navigation frames a project-card grid. Each card repeats a name, status, short description, date, priority, and task count.                                        | Adapt repeated field order and restrained status labels. Use rows for one product's capabilities. A completed card's percentage illustrates why progress and readiness need distinct meanings. |
| Opero AI[^opero]          | A close-up workflow composition places project health, blocked tasks, schedule risk, and capacity in one divided panel. Curved connectors join tilted surrounding cards. | Adapt the compact label/value rows. Reject tilted panels, connector decoration, and a health percentage with no assessment contract.                                                           |
| Oripio Product[^oripio]   | Product identity and view controls precede four labelled task columns. Each card repeats deadline, description, milestone count, people, and priority.                   | Retain stable identity and explicit view names. Do not use a Kanban grid as the default product assessment or import task-tracking scope.                                                      |
| Proxel by Abu. M[^proxel] | A full-width table aligns project, status, users, completion, and actions. A filter menu sits above the rows. Red delete controls repeat down the right edge.            | Adapt shared columns and a quiet filter. Keep destructive actions in management views and avoid completion bars as release evidence.                                                           |

# Hierarchy and disclosure

NN/g describes visual hierarchy through contrast, scale, and grouping. Equal emphasis and excess contrast can undermine that order.[^hierarchy]

Give the candidate conclusion one clear position. Use the same column alignment below it. Repeated borders, bright chips, and secondary action buttons should not rival that conclusion.[^proposal]

NN/g's disclosure guidance keeps frequently needed information visible. It requires clear labels for secondary details.[^disclosure]

Expose unresolved claims and coverage gaps in the overview. Evidence history, full topology, and record forms can follow an explicit link. A reviewer should not open every capability to discover whether required checks exist.[^proposal]

# Bounded evidence ledger

Inspected on 2026-10-14 in Europe/Berlin. Scope covered seven Dribbble pages, their displayed media, and two NN/g articles. Search results served discovery only. The research agent closed its `overview-reference-study` browser session. Browser captures remain in ignored `.agents/browser/`.

| Source                    | Media inspected                                                                                                                                                                                                                                                                           | Limit                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `nkemka`                  | [Project dashboard image](https://cdn.dribbble.com/userupload/10216010/file/original-fa1e890964cd3b3627766f9afe890026.jpeg?resize=1024x576&vertical=center)                                                                                                                               | Static image, lower activity content cropped.                                                       |
| `goran`                   | [Project dashboard image](https://cdn.dribbble.com/userupload/41938892/file/original-a82f370f1677b246cee906cf27fba697.jpg?resize=768x576&vertical=center)                                                                                                                                 | Static composition with decorative framing.                                                         |
| `vitaldash`               | [Health report image](https://cdn.dribbble.com/userupload/42888019/file/original-52296d468bcfce9bae7d35f360151786.png?resize=1024x896&vertical=center)                                                                                                                                    | Static report, lower risk rows cropped.                                                             |
| `jason`                   | [Project cards image](https://cdn.dribbble.com/userupload/46108375/file/c6c567307dcefe2106e8cf4d283b498c.png?resize=1024x768&vertical=center)                                                                                                                                             | Static portfolio composition.                                                                       |
| `opero`                   | [Health-panel close-up](https://cdn.dribbble.com/userupload/48939160/file/62bd0514cbc9ec844f898b857d39744c.jpg?resize=1024x768&vertical=center)                                                                                                                                           | Close-up only. Full workspace and behavior not inspected.                                           |
| `oripio`                  | [Task-board poster](https://cdn.dribbble.com/userupload/48865625/file/still-05601831782a1f5971ec798c41d04570.png) and one paused video frame                                                                                                                                              | Poster supports the layout comparison. The video frame shows a task form, not a tested interaction. |
| `proxel`                  | [Whole-table image](https://cdn.dribbble.com/userupload/46586463/file/64f6956ac552db087e5bda34f28c721a.png?resize=1024x768&vertical=center) and [filter close-up](https://cdn.dribbble.com/userupload/46586462/file/6bceb40d44a5e3f3f624bbb58b918631.png?resize=1024x768&vertical=center) | Static filter state, no interaction evidence.                                                       |
| `hierarchy`, `disclosure` | First-party article text                                                                                                                                                                                                                                                                  | General design guidance. It does not validate StateBoard's implementation.                          |

The local retrieval used direct file reads because no OKF retrieval service was available. Baseline commit was `46f6a94b95900250c9eab3b51df1d7e67255613d`. The inspected workspace pattern SHA-256 was `853d54ed71fffa933c606d8034b3caeb6326f2c7690f4cdf1318a2988ba8c322`.

This is a comparative study, not a source-site export. Source typography, contrast, responsive behavior, keyboard access, and production use remain unverified. The proposal needs real-app checks with sparse and dense product records, narrow widths, and keyboard navigation. The study includes no human usability test or measured improvement.

[^nkemka]: Nkemka Humphrey, published Dribbble page and dashboard image.

[^goran]: Goran Tomičić, published Dribbble page and dashboard image.

[^vitaldash]: Balveer Singh, published Dribbble page and health-report image.

[^jason]: Jason D, published Dribbble page and project-card image.

[^opero]: Jatin Lathiya, published Dribbble page and health-panel image.

[^oripio]: Oripio Product, published Dribbble page, poster, and paused video frame.

[^proxel]: Abu. M, published Dribbble page and two project-table images.

[^hierarchy]: Kelley Gordon, NN/g, Visual Hierarchy in UX, January 17, 2021.

[^disclosure]: Jakob Nielsen, NN/g, Progressive Disclosure, December 3, 2006.

[^proposal]: Agent-authored application of the observed references and StateBoard's existing product boundaries.

[^existing-pattern]: Workspace pattern read before implementation. Its side-by-side overview is the layout under review.

[^purpose]: StateBoard's product purpose defines capabilities, dependencies, checks, evidence, and role-specific review. Task tracking remains outside scope.
