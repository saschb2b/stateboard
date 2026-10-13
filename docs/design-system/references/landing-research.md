---
type: Reference
title: Product landing page research
description: Observed landing page patterns and a homepage direction for StateBoard.
tags: [research, landing-page, release-readiness]
status: draft
generated: { by: codex/unversioned, at: 2026-10-13T21:45:14Z }
stale_after: 2027-01-13
sources:
  - id: lunexa
    resource: https://dribbble.com/shots/26894484-Lenexa-Landing-Page-Hero
    title: Lenexa Landing Page Hero by ideapeel
  - id: zain
    resource: https://dribbble.com/shots/27362294-Project-management-SaaS-landing-page-hero
    title: Project management SaaS landing page hero by Zain's Studio
  - id: prokta
    resource: https://dribbble.com/shots/25477503-Project-management-SaaS-website-design
    title: Project management SaaS website design by Josim for Opndoo Studio
  - id: kinetix
    resource: https://dribbble.com/shots/27285183-Kinetix-Smart-Project-Management-Landing-Page
    title: Kinetix by Designfuzz
  - id: organix
    resource: https://dribbble.com/shots/26628681-Project-Management-SaaS-Landing-Page-Website-Design
    title: Project Management SaaS Landing Page by Ikbal Mahmud
  - id: taskxen
    resource: https://dribbble.com/shots/26541224-Task-Management-SaaS-Website-UIUX-Design
    title: Task Management SaaS Website UIUX Design by Ui Mile
  - id: developers
    resource: https://dribbble.com/shots/19338995-Developers-Landing-Page
    title: Developers Landing Page by Zahra Mohammadi for Pela Design
  - id: linear-home
    resource: https://linear.app/
    title: Linear homepage
  - id: plane-home
    resource: https://plane.so/
    title: Plane homepage
---

# Homepage direction

Lead with the release question and show a readable assessment beside or directly below it. A visitor should see the candidate, readiness conclusion, and unresolved work without opening the example.

Use the charcoal surfaces, warm orange accent, and Geist typography from the [design system](../overview.md). Give the headline more space than a workspace heading. Keep the product preview consistent with the [working interface direction](interface-research.md).

Place one primary action beside a quiet example link. Follow the preview with a short explanation of how capabilities, dependencies, and evidence support the decision. Explain agent and CI maintenance through the existing API and MCP. Keep human approval distinct from automatic maintenance.

# Observations

The research agent visually inspected seven Dribbble compositions. Their accompanying pages establish authorship and titles. The table records visible structure, with StateBoard decisions stated separately.

| Source                   | Observed composition                                                                                                                                           | StateBoard decision                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Lunexa[^lunexa]          | A centered headline and two actions lead into a dark dashboard. The preview contains project rows, a task list, and messages. Floating avatars flank the copy. | Use a recognizable product surface. Omit floating avatars and preserve the useful rows when sizing the preview.                |
| Zain's Studio[^zain]     | A heavy headline sits below a floating black navigation bar. Tilted integration and conversation cards fill the lower section.                                 | Use a clear difference between headline and supporting copy. Omit the tilted collage, which does not show a complete task.     |
| Prokta[^prokta]          | A blue sky backdrop frames a centered hero and a flat dashboard. Navigation, a sidebar, and dashboard columns make the product recognizable.                   | Keep the preview flat and structured. Replace generic dashboard metrics with the release verdict and supporting findings.      |
| Kinetix[^kinetix]        | Thin vertical rules align the hero with a broad dashboard frame. Purple streaks and a glow surround the preview.                                               | Use alignment between page copy and product frame. Omit decorative lighting and unrelated task-count cards.                    |
| Organix[^organix]        | A compact hero leaves much of the composition to a dashboard. A pale grid and pill navigation repeat the purple accent.                                        | Keep the route into the product short. Avoid copying pill-shaped navigation or repeated progress charts.                       |
| TaskXen[^taskxen]        | A large dark hero uses one bright action. Decorative rails, an adoption claim, and a rating row precede a heavily cropped dashboard.                           | Keep one clear primary action. Use product content in place of decorative rails or unverified adoption claims.                 |
| Pela Design[^developers] | A developer landing page uses angular display type, fine borders, and layered code panels. The composition includes an angled background page.                 | Demonstrate the actual agent workflow where useful. Keep Geist and a readable, flat preview instead of decorative code layers. |

The Lunexa image spells the product name differently from its Dribbble page title. The source title above preserves the published page name.

Linear's homepage content moves from a product proposition into an issue with activity, properties, and a review result. Later sections cover intake, planning, agents, and shipping[^linear-home]. This gives StateBoard a useful content pattern: explain the product through work a reader can recognize.

Plane places its deployment options near the opening proposition and provides a demo route. Later sections distinguish agent workflows, work views, self-hosting, and API/MCP extension[^plane-home]. StateBoard can state its deployment model and maintenance paths plainly, without importing Plane's broader product scope.

# Bounded source ledger

The study covers nine selected pages and seven public Dribbble images, inspected on 2026-10-13. Depth was one link from each selected page to its image. Allowed hosts were `dribbble.com`, `cdn.dribbble.com`, `linear.app`, and `plane.so`. Search results served discovery only. Designer profiles, signup flows, private workspaces, and alternate carousel images were outside scope.

| Source ID     | Material inspected                                                                                                                                 | Limit                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `lunexa`      | Page and [hero image](https://cdn.dribbble.com/userupload/46095084/file/ddedcaf156c68d5e1e42fb42e0f0adba.png?resize=752x&vertical=center)          | Static crop of the hero and dashboard.                              |
| `zain`        | Page and [hero image](https://cdn.dribbble.com/userupload/47679838/file/51c64699a0ffc3a8fe4ac3f9c5a2647d.png?resize=2048x1536&vertical=center)     | Static composition with presentation framing.                       |
| `prokta`      | Page and [hero image](https://cdn.dribbble.com/userupload/18446344/file/original-4c123986702b41a34518923387946831.png?resize=752x&vertical=center) | Lower dashboard content falls outside the image.                    |
| `kinetix`     | Page and [hero image](https://cdn.dribbble.com/userupload/47410205/file/1a0cc156fbbd98de87b5aea0dce2a94f.png?resize=1600x1200)                     | Dashboard is cropped below its first sections.                      |
| `organix`     | Page and [hero image](https://cdn.dribbble.com/userupload/45239708/file/33ceab6889fc821324763da133a2172e.png?resize=752x&vertical=center)          | Small labels do not support detailed interaction claims.            |
| `taskxen`     | Page and [hero image](https://cdn.dribbble.com/userupload/44959407/file/68ee4cb89180a4463e252e9a0f01ae4e.jpg?resize=1600x1200)                     | Only the dashboard header is visible. Linked live preview excluded. |
| `developers`  | Page and [layered page image](https://cdn.dribbble.com/users/5460588/screenshots/19338995/media/a93fe591cae4304946d63c76e6088d5c.png)              | Angled composition, no responsive or working code example.          |
| `linear-home` | Public homepage text and document order                                                                                                            | Image request returned 403. No visual homepage inspection.          |
| `plane-home`  | Public homepage text and document order                                                                                                            | Hero image retrieval failed. No visual homepage inspection.         |

The browser tool exposed no connected surface during this pass. The research agent retrieved Dribbble images from their public URLs for local pixel inspection. The app and bundle contain no reference images.

# Adoption and verification

| Pattern                                              | Disposition                                                    | Verification still needed                                           |
| ---------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Headline followed by a product preview               | Adapt to a left-aligned release question and assessment frame. | Check reading order and preview legibility in the implemented page. |
| Primary action plus demo route                       | Adopt using existing StateBoard destinations.                  | Check links, keyboard focus, and narrow layout.                     |
| Product-specific workflow sections                   | Adapt to scope, evidence, and human review.                    | Match every claim to implemented behavior.                          |
| Glows, tilted panels, floating avatars, metric grids | Exclude from the homepage direction.                           | No implementation requested.                                        |
| Customer logos, ratings, adoption figures            | Exclude without verified StateBoard evidence.                  | No proof claims imported from references.                           |

These decisions are agent-authored design proposals. The study establishes no measured usability or conversion improvement, human approval, keyboard behavior, or responsive behavior.

This is a comparative reference, not a source-site export. It does not claim ODSF's full source-export convergence gate. No complete CSS census, DOM reconstruction, icon inventory, or source-to-clone comparison ran. Source colors, dimensions, typography values, motion, and accessibility guarantees remain unverified. StateBoard's foundations own those choices.

[^lunexa]: ideapeel, Lenexa Landing Page Hero. Published image visually inspected on 2026-10-13.

[^zain]: Zain's Studio, Project management SaaS landing page hero. Published image visually inspected on 2026-10-13.

[^prokta]: Josim for Opndoo Studio, Project management SaaS website design. Published image visually inspected on 2026-10-13.

[^kinetix]: Designfuzz, Kinetix. Published image visually inspected on 2026-10-13.

[^organix]: Ikbal Mahmud, Project Management SaaS Landing Page. Published image visually inspected on 2026-10-13.

[^taskxen]: Ui Mile, Task Management SaaS Website UIUX Design. Published image visually inspected on 2026-10-13.

[^developers]: Zahra Mohammadi for Pela Design, Developers Landing Page. Published image visually inspected on 2026-10-13.

[^linear-home]: Linear homepage, public text and document order read on 2026-10-13.

[^plane-home]: Plane homepage, public text and document order read on 2026-10-13.
