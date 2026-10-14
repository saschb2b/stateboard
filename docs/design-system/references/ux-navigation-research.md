---
type: Reference
title: Board editing and wayfinding research
description: Inspected project interfaces and guidance for board editing, parent navigation, and save feedback.
tags: [research, board-settings, navigation, editing]
status: draft
generated: { by: codex/gpt-6, at: 2026-10-14 }
stale_after: 2027-01-14
sources:
  - id: zaga
    resource: https://dribbble.com/shots/27392509-Zaga-Project-Management-Dashboard-Project-Details
    title: Zaga project details by Ananto Nugroho Putra for Korsa
  - id: kevin
    resource: https://dribbble.com/shots/26504105-Project-Settings-Page
    title: Project Settings Page by Kevin Manjit
  - id: sendrell
    resource: https://dribbble.com/shots/27486701-Sendrell-Project-Settings-Dashboard
    title: Sendrell project settings by Effa Krisma
  - id: olack
    resource: https://dribbble.com/shots/27351782-Project-Management-Dashboard-UI-Design
    title: Project Management Dashboard UI Design by Sohan Talukder for Olack
  - id: breadcrumbs
    resource: https://www.nngroup.com/articles/breadcrumbs/
    title: Breadcrumbs, 11 Design Guidelines for Desktop and Mobile
  - id: carbon
    resource: https://www.carbondesignsystem.com/building-blocks/core/components/breadcrumb/guidelines
    title: Carbon breadcrumb guidelines
  - id: back
    resource: https://design-system.service.gov.uk/components/back-link/
    title: GOV.UK Back link
  - id: linear
    resource: https://linear.app/docs/projects
    title: Linear Projects
  - id: inline
    resource: https://atlassian.design/components/inline-edit/usage/
    title: Atlassian inline edit usage
  - id: recognition
    resource: https://www.nngroup.com/articles/recognition-and-recall/
    title: Memory Recognition and Recall in User Interfaces
  - id: feedback
    resource: https://design-system.service.gov.uk/components/notification-banner/
    title: GOV.UK Notification banner
  - id: application
    resource: Agent-authored interpretation of inspected sources for StateBoard, 2026-10-14
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: src/components/board/board-settings.tsx
  - resource: src/components/release/use-release-navigation.ts
---

# Board context and nearby destinations

A reviewer needs to edit the current board and return to its parent pages without restarting from the board list. The selected direction uses a compact linked hierarchy, visible editing, and explicit save feedback. It extends the [product overview](../patterns/product-overview.md), [review workspace](../patterns/review-workspace.md), and [supporting surfaces](../patterns/supporting-surfaces.md).[^application]

# Visual comparison

The agent inspected the published pages and their images on 2026-10-14. These observations concern visible composition. Designer claims about usability remain unverified.

| Reference            | Visible structure                                                                                             | StateBoard application                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Zaga[^zaga]          | A breadcrumb precedes project identity. Overview, Tasks, Files, Brief, Timeline, and Activity sit beneath it. | Separate parent hierarchy from sibling sections. Omit its completion bar and supplementary cards from release readiness. |
| Kevin Manjit[^kevin] | Settings appears beside project sections. An Identity form groups title and description.                      | Keep a labelled settings destination and one form for board identity. The image does not establish save behavior.        |
| Sendrell[^sendrell]  | Project Settings has local tabs, labelled form sections, visible Save controls, and a separate danger zone.   | Separate ordinary editing from deletion. Use readable controls and distinct section names.                               |
| Olack[^olack]        | A left project tree frames a dense Kanban composition with repeated colored task cards.                       | Retain visible project context. Its card layout offers little help for board editing or parent navigation.               |

# Behavior guidance

NN/g recommends breadcrumbs that reflect hierarchy and support nearby parent destinations. On mobile, an immediate-parent link can replace a crowded trail. Carbon treats breadcrumbs as secondary navigation, with linked ancestors and a noninteractive current item. Together they support retaining section tabs while adding parent links.[^breadcrumbs][^carbon]

GOV.UK distinguishes a journey's Back action from breadcrumbs and advises against displaying both together. A Back action should preserve the page's prior state. StateBoard uses named parent destinations for direct deep links. Browser Back and Forward separately restore the selected assessment view and finding.[^back][^application]

Linear exposes project editing through overview properties and an Edit project action in lists. NN/g's recognition guidance favors visible functions over memorized gestures. StateBoard applies this through **Edit board** beside product identity and in board rows, with **History** in the product tools. Each product screen has one board editing entry point.[^linear][^recognition][^application]

Atlassian requires clear editing affordances and visible save/cancel controls. Its larger text fields remain open when focus moves, preventing accidental submission or dismissal. StateBoard uses explicit Save and Discard controls, retains settings drafts across section changes, and preserves the draft after a failed request.[^inline][^application]

GOV.UK supports outcome feedback for actions within a continuing journey. StateBoard confirms a completed save in place and announces the result. A separate confirmation page would interrupt the board review.[^feedback][^application]

# Coverage and limits

The study inspected four Dribbble pages, three complete project/settings images, and a fourth composition inside its published page. Seven primary guidance pages support the behavior comparison. The former Linear project-overview URL returned 404, so the current Projects documentation supplied its editing instructions.

This bounded study includes no source-site interaction test, mobile validation, or independent human usability result. The [interaction rules](../behaviors/interaction.md) define checks for StateBoard's implementation. Test long names, both languages, direct deep links, keyboard use, history restoration, and failed saves.

[^zaga]: Published page and full project-details image, including the ancestor trail and local tabs.

[^kevin]: Published page and full Identity settings image.

[^sendrell]: Published page and full project-settings image.

[^olack]: Published page and viewport images of the dashboard composition.

[^breadcrumbs]: NN/g, breadcrumb hierarchy and mobile guidance.

[^carbon]: Carbon, breadcrumb placement, linked parents, overflow, and current-page treatment.

[^back]: GOV.UK, Back link placement, preserved state, and destination-specific labels.

[^linear]: Linear, editing project properties from overview and list contexts.

[^inline]: Atlassian, visible editing controls and larger-text blur behavior.

[^recognition]: NN/g, contextual cues and visible interface functions.

[^feedback]: GOV.UK, feedback for a completed action within an ongoing journey.

[^application]: Agent-authored design choices for StateBoard's existing board and assessment structure.
