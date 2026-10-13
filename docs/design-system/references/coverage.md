---
type: Reference
title: Interface research coverage
description: Bounded source ledger for the StateBoard interface study.
tags: [research, coverage, provenance]
status: draft
generated: { by: codex/unversioned, at: 2026-10-13T21:19:01Z }
stale_after: 2027-01-13
sources:
  - id: research
    resource: interface-research.md
    title: Project management interface research
---

# Scope

This ledger supports [interface research](interface-research.md) and the [design system](../overview.md). It records a comparative study, not a source-site clone.

The later [landing study](landing-research.md) has its own bounded page and image ledger. The [supporting screen contracts](../patterns/supporting-surfaces.md) record app requirements separately from external research coverage.

The bound was 13 reference pages, plus their directly linked public images, at one link depth. Hosts were `dribbble.com`, `cdn.dribbble.com`, `linear.app`, `plane.so`, `docs.plane.so`, and `media.docs.plane.so`. Search pages served discovery only. Profiles, recommended shots, signup flows, and private workspaces were outside scope.

# Pages

The research agent read all entries on 2026-10-13. Image links below identify the rendered artifacts. The research concept's source list holds page URLs.

| Source ID        | Material inspected                                                                                                                                                                                                                                                                               | Coverage limit                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `oripio`         | [Main list image](https://cdn.dribbble.com/userupload/48686240/file/6b9f1cf919c248ac769292f1ad0e4d94.jpg?resize=752x&vertical=center) and page                                                                                                                                                   | No animation or alternate carousel images.                  |
| `piqo-dark`      | [Angled detail](https://cdn.dribbble.com/userupload/2852871/file/original-83fe3c512f72fd3a393e2fddd7f09292.png?resize=752x&vertical=center), [flat detail](https://cdn.dribbble.com/userupload/2852872/file/original-9bacb488ced2706aabc5012e66202e98.png?resize=752x&vertical=center), and page | Remaining attachments excluded.                             |
| `manisha`        | [Task detail](https://cdn.dribbble.com/userupload/44857032/file/83efd948511da4cdc4a885b45fb453dd.png?resize=752x&vertical=center) and page                                                                                                                                                       | Popup attachment not inspected.                             |
| `diki`           | [Main composition](https://cdn.dribbble.com/userupload/45518112/file/0e097280ef8f11bdbbffa3b71f12aeb9.jpg?resize=752x&vertical=center), [laptop composition](https://cdn.dribbble.com/userupload/45518115/file/f2ed5b9267fcd5754a714ef032922d67.jpg?resize=752x&vertical=center), and page       | Angled imagery limits fine-detail reading.                  |
| `noryn`          | [Full dashboard](https://cdn.dribbble.com/userupload/48866578/file/8fc92e9fa59e3ca9023da63b08f5364b.png?resize=752x&vertical=center) and page                                                                                                                                                    | Small labels not treated as reliable text.                  |
| `mike`           | [Main dashboard](https://cdn.dribbble.com/userupload/37228574/file/original-47750922700e71f092574d755e8f9d1e.jpg?resize=752x&vertical=center) and page                                                                                                                                           | Other carousel slides excluded.                             |
| `ay`             | [Task/activity crop](https://cdn.dribbble.com/userupload/48744304/file/09866612191d107522a50d05368b129d.png?resize=752x&vertical=center) and page                                                                                                                                                | The crop does not show the full workspace.                  |
| `sayef`          | [Main board composition](https://cdn.dribbble.com/userupload/3225904/file/original-ce75c45c762e39debc837e5cd907d4d3.png?resize=752x&vertical=center) and page                                                                                                                                    | Other attachments excluded.                                 |
| `piqo-light`     | [Light detail composition](https://cdn.dribbble.com/userupload/35743467/file/original-9b392524d05426cec52a5f5858a23e09.png?resize=752x&vertical=center) and page                                                                                                                                 | Companion to the dark reference, not an independent design. |
| `linear`         | Public project overview image in the rendered planning page and page copy                                                                                                                                                                                                                        | Marketing surface, not a signed-in workspace.               |
| `plane-detail`   | Documentation and [side-peek screenshot](https://media.docs.plane.so/work-items/work-item-side-peek.webp#hero)                                                                                                                                                                                   | No live work-item interaction.                              |
| `plane-views`    | Documentation                                                                                                                                                                                                                                                                                    | Behavior described by the product, not exercised.           |
| `plane-redesign` | Product team's explanation                                                                                                                                                                                                                                                                       | Its research claim applies to Plane.                        |

# Pattern inventory

| Unit                         | Observed sources       | Decision                                                                | State                                      |
| ---------------------------- | ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| Compact grouped records      | Oripio, Noryn          | Adopt aligned capability and check rows.                                | Reconciled with inspected imagery.         |
| Detail in context            | Piqo dark/light, Plane | Adopt disclosure that preserves the assessment and selected capability. | Reconciled with imagery and documentation. |
| Compact title and properties | Manisha, Linear, Plane | Adopt one title followed by the context needed for the decision.        | Reconciled with imagery and documentation. |
| Quiet navigation selection   | Oripio, Diki, Sayef    | Adopt a restrained selected state.                                      | Reconciled with inspected imagery.         |
| Dashboard metrics and gauges | Mike, Noryn            | Reject for the readiness reading surface.                               | Recorded design decision.                  |
| Large greeting and promotion | AYDesign, Sayef        | Reject inside working screens.                                          | Recorded design decision.                  |

# Unverified areas

The bounded review is complete for the listed observations. It does not claim ODSF's full source-export convergence gate. No complete stylesheet census, icon inventory, source DOM reconstruction, or source-to-clone render comparison ran. Exact source tokens and component interaction states remain unverified.

Colors, typography values, spacing, shape, motion, layering, and icon choices must come from StateBoard's implementation and documented foundations. Screenshot observations supply no numerical token values. The app does not embed the linked reference imagery.

The sources do not establish StateBoard's content conventions, localization, focus policy, or accessibility guarantees. Those require app-specific rules and checks. The [design system](../overview.md) owns those contracts, while this ledger records only the external comparison.
