---
type: Reference
title: Project management interface research
description: Observed interface patterns and their application to StateBoard release reviews.
tags: [research, project-management, release-readiness]
status: draft
generated: { by: codex/unversioned, at: 2026-10-13T21:19:01Z }
stale_after: 2027-01-13
sources:
  - id: oripio
    resource: https://dribbble.com/shots/27640246-Project-Management-Dashboard-Design
    title: Oripio project management dashboard
  - id: piqo-dark
    resource: https://dribbble.com/shots/18463865-Project-Management-Dashboard-Timeline-Details-Tasks-List-Dark
    title: Piqo dark timeline details
  - id: manisha
    resource: https://dribbble.com/shots/26509047-Task-Management-Dashboard
    title: Manisha Shah task detail
  - id: diki
    resource: https://dribbble.com/shots/26714589-Project-Management-Dashboard-Saas
    title: Diki Ramdani project management dashboard
  - id: noryn
    resource: https://dribbble.com/shots/27689136-Dark-SaaS-Project-Management-Dashboard-UI
    title: Noryn dark project dashboard
  - id: mike
    resource: https://dribbble.com/shots/16018110-project-management-dashboard-ui
    title: Mike Taylor dark dashboard
  - id: ay
    resource: https://dribbble.com/shots/27656074-Project-Management-Dashboard-Web-App-UI-Design
    title: AYDesign project management dashboard
  - id: sayef
    resource: https://dribbble.com/shots/18934128-Project-management-dashboard-UI
    title: Sayef Mahmud project management dashboard
  - id: piqo-light
    resource: https://dribbble.com/shots/17619018-Project-Management-Dashboard-Timeline-Details-Tasks-List
    title: New Monday light timeline details
  - id: linear
    resource: https://linear.app/plan
    title: Linear project planning
  - id: plane-detail
    resource: https://docs.plane.so/work-items/work-item-details
    title: Plane work item details
  - id: plane-views
    resource: https://docs.plane.so/core-concepts/views
    title: Plane views
  - id: plane-redesign
    resource: https://plane.so/blog/new-work-item-detail-view-custom-relations-and-more
    title: Plane work item detail redesign
---

# Direction

StateBoard uses a quiet release workspace with a visible conclusion, compact rows, and details opened in context. The [design system](../overview.md) applies this direction through the app's theme and components.

This research compared eight distinct Dribbble concepts, one light companion, and first-party Linear and Plane material. The [coverage ledger](coverage.md) records inspected images and limits. These are design observations, not customer research or measured improvements.

# Observations and decisions

| Source                            | Observed in imagery                                                                                               | StateBoard decision                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Oripio[^oripio]                   | Narrow sidebar, one project heading, slim tabs, and grouped rows with stable property columns.                    | Use aligned release and capability rows. Keep the heading and main action separate from record details.            |
| Piqo dark[^piqo-dark]             | A detail panel preserves the timeline behind it. Compact properties precede tabs and a task list.                 | Preserve assessment and capability context when opening checks. Keep secondary information behind disclosure.      |
| Manisha Shah[^manisha]            | Breadcrumb, strong task title, aligned label/value properties, attachments, and grouped subtasks.                 | Use clear metadata alignment. Omit the large motivational progress card, which does not explain release readiness. |
| Diki Ramdani[^diki]               | Nested project navigation, compact view choices, work columns, and a separate conversation panel.                 | Keep location stable across profession views. Omit permanent chat and unrelated collaboration controls.            |
| Noryn[^noryn]                     | Dark navigation, local project tabs, a compact task table, and a property column. Charts compete above the table. | Use quiet surfaces and compact rows. Omit chart and metric grids that displace readiness findings.                 |
| Mike Taylor[^mike]                | Dark navigation surrounds bright charts, statistic cards, and a progress gauge.                                   | Use restrained surface separation. Reject the gauge and card grid for release review.                              |
| AYDesign[^ay]                     | Strong type hierarchy, neutral surfaces, sparse green accents, and large rounded cards.                           | Use distinct heading and metadata styles. Reduce card padding and avoid large greetings or excessive pills.        |
| Sayef Mahmud[^sayef]              | Pale navigation selection and compact tabs sit below a large promotional banner.                                  | Keep the selected navigation treatment. Omit promotion and decorative illustration from working screens.           |
| Piqo light companion[^piqo-light] | The same detail hierarchy works with thin separators on a light surface.                                          | Keep structure independent of color, gradients, and shadows.                                                       |

Oripio's inspected image contains a list, although its page description emphasizes Kanban. The image informs the observation here.

Linear's public product imagery places compact properties and linked resources below one project title[^linear]. This supports a short context line instead of separate metadata cards.

Plane documents a side panel that preserves list context, common properties below the title, and collapsible secondary property groups[^plane-detail]. Its views retain the same underlying work items while changing filters and display[^plane-views]. StateBoard's profession views follow that distinction and do not alter authorization or readiness rules.

Plane reports grouping properties because people repeatedly searched the same fields[^plane-redesign]. This is evidence about Plane's research. It does not establish a measured benefit for StateBoard.

# Application rules

- Show one readiness conclusion. Place blockers and evidence gaps close to the action that opens their checks.
- Use short, aligned rows with a visible owner and state. Show the full capability outcome after expansion.
- Use brand color for selection and primary actions. Keep readiness colors semantic and pair them with text.
- Keep repeated metadata, evidence history, and source references behind named disclosure.
- Preserve readable wrapping on narrow screens. Move secondary information into disclosure instead of compressing desktop columns.
- Use theme tokens. This study extracted no colors, dimensions, font names, motion durations, or accessibility guarantees from screenshots.

# Limits

Dribbble images are static compositions, sometimes with angled or cropped views. They do not prove keyboard behavior, responsive layout, contrast, or usability. The study inspected Linear and Plane through public imagery and documentation, without a signed-in product session.

The proposed direction is an agent-authored adaptation to StateBoard's existing product model. This document records no human design approval or independent user study. Browser checks against the implemented app remain necessary.

[^oripio]: Oripio, Project Management Dashboard Design. Main list image inspected on 2026-10-13.

[^piqo-dark]: Emmanuel Ikechukwu for Piqo Studio, dark timeline details. Two detail images inspected on 2026-10-13.

[^manisha]: Manisha Shah, Task Management Dashboard. Full task detail image inspected on 2026-10-13.

[^diki]: Diki Ramdani, Project Management Dashboard. Main image and laptop composition inspected on 2026-10-13.

[^noryn]: Noryn, Dark SaaS Project Management Dashboard. Purple-accent full dashboard image inspected on 2026-10-13.

[^mike]: Mike Taylor for Dark UI, project management dashboard. Main dashboard image inspected on 2026-10-13.

[^ay]: AYDesign, Project Management Dashboard. Cropped task/activity image inspected on 2026-10-13.

[^sayef]: Sayef Mahmud for Pixel Navy Agency, project management dashboard. Main board image inspected on 2026-10-13.

[^piqo-light]: Emmanuel Ikechukwu for New Monday, light timeline details. Main detail image inspected on 2026-10-13.

[^linear]: Linear, Plan and navigate from idea to launch. Public project overview imagery inspected on 2026-10-13.

[^plane-detail]: Plane, Work item details. Documentation and side-peek screenshot inspected on 2026-10-13.

[^plane-views]: Plane, Views. Public documentation read on 2026-10-13.

[^plane-redesign]: Plane, New work-item detail view, subscribers, voting and custom relations. Public explanation read on 2026-10-13.
