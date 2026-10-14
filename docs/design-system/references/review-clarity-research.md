---
type: Reference
title: Release review clarity research
description: UX literature, simulated role findings, and real-product screen linking behind contextual release review.
tags: [research, clarity, forms, progressive-disclosure]
status: draft
generated: { by: codex/gpt-6, at: 2026-10-14 }
stale_after: 2027-01-14
sources:
  - id: language
    resource: https://www.nngroup.com/articles/match-system-real-world/
    title: Match Between the System and the Real World
  - id: recognition
    resource: https://www.nngroup.com/articles/recognition-and-recall/
    title: Memory Recognition and Recall in User Interfaces
  - id: disclosure
    resource: https://www.nngroup.com/articles/progressive-disclosure/
    title: Progressive Disclosure
  - id: forms
    resource: https://www.gov.uk/service-manual/design/form-structure
    title: Structuring forms
  - id: effort
    resource: https://www.nngroup.com/articles/eas-framework-simplify-forms/
    title: Less Effort, More Completion
  - id: tasks
    resource: https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
    title: Complete multiple tasks
  - id: review
    resource: Agent-simulated product manager and release owner walkthrough of the local StateBoard product and candidate on 2026-10-14; read-only browser observations, no independent human participants.
  - id: application
    resource: Agent-authored application of inspected literature and the user's request to reduce concept and manual-entry overhead, 2026-10-14.
  - id: product-use
    resource: Agent use of local StateBoard board koxCb-c26Umw for the installed ChatGPT desktop app on 2026-10-14; recorded browser interactions and app-tool responses, without independent human participants.
  - id: release-notes
    resource: https://learn.chatgpt.com/docs/changelog
    title: ChatGPT and Codex changelog
  - id: screen-use
    resource: Agent use of the ChatGPT desktop app product board to upload official reference images, annotate regions, and link features on 2026-10-14; no independent human participants.
  - id: browser-image
    resource: https://learn.chatgpt.com/docs/changelog#codex-2026-04-16-app
    title: Official browser image in the Codex app 26.415 entry
  - id: project-image
    resource: https://learn.chatgpt.com/docs/changelog#codex-2026-02-02
    title: Official app image in the Codex launch entry
  - resource: src/components/release/assessment-create-form.tsx
  - resource: src/components/evidence/verification-method.tsx
  - resource: src/components/evidence/evidence-history.tsx
  - resource: src/components/release/use-workspace-refresh.ts
  - resource: docs/product/model.md
  - resource: src/components/release/release-workspace.tsx
  - resource: src/components/release/product-workspace.tsx
---

# Evidence and limits

The agent read six primary UX guidance pages on 2026-10-14. This bounded review addresses conceptual load and manual record maintenance. Search results supplied discovery. The linked pages supplied the principles below. It does not establish that the revised StateBoard interface is usable without human testing.

| Inspected guidance                     | Supported principle                                                                                                                         | StateBoard interpretation                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Familiar language[^language]           | Use the user's vocabulary and a natural order instead of system-oriented terms.                                                             | Present **Release reviews** and **Features**, while keeping assessment and capability identifiers in the API.                           |
| Recognition[^recognition]              | Visible choices and contextual cues reduce recall; help beside the task is more useful than a tutorial to memorize.                         | Keep the selected feature and release visible when creating its check or recording a result.                                            |
| Progressive disclosure[^disclosure]    | Show frequent actions first and label secondary options clearly. Wizards are problematic when users alternate between interdependent steps. | Keep review, checks, and decision primary. Disclose supporting architecture and uncommon fields without forcing a setup sequence.       |
| Question protocol[^forms]              | Ask only for information with a known use, relevant audience, accuracy check, and maintenance need.                                         | Explain why exact candidate/context fields are necessary; defer fields that do not help the current action.                             |
| Eliminate, automate, simplify[^effort] | Remove unnecessary work, reuse known data, and simplify remaining input. Defaults must remain reviewable.                                   | Carry the selected target and known owner/environment into forms. Generate a manual observation identity; never infer a passing result. |
| Multiple tasks[^tasks]                 | Simplify the transaction before adding a task list. Group related actions and make unfinished work visible.                                 | Offer the next action beside its unresolved feature or check instead of adding a permanent setup checklist.                             |

The final column records design inferences, not claims made by the sources.[^application] The [review workspace](../patterns/review-workspace.md), [product overview](../patterns/product-overview.md), and [interaction rules](../behaviors/interaction.md) define their implementation contracts.

# Simulated persona observations

Agents adopted the perspectives of a product manager, release owner, backend engineer, and QA specialist and inspected the existing local product and candidate. The agents interpreted these interface obstacles through simulated roles. They are not participant quotes, human usability validation, or release evidence.[^review]

| Task                                      | Observed obstacle                                                                                                                            | Adopted response                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explain what a feature needs              | Feature cards exposed Edit/Archive and visual-anchor counts, without a nearby support or verification action.                                | Put supporting systems/screens on the feature; put its checks/results inside its release-review row.                                                     |
| Connect a known feature to implementation | The Connections list contained 22 mappings; its form asked the reviewer to select the feature again.                                         | Open linking from that feature and carry its identity into the request.                                                                                  |
| Inspect backend verification              | Architecture listed ten components and then all nine checks, including unrelated claims; scoped empty checks lacked a contextual add action. | Reveal scoped checks after a feature/component is selected and keep Add check in that context.                                                           |
| Find the next release action              | Perspective tabs mixed review tasks with professional roles; Operations repeated a filtered check list.                                      | Use Overview, Checks, and Decision as primary tasks. Treat operational concerns as check filters.                                                        |
| Record a manual observation               | Source and run/reference fields preceded the value of recording a result and observation.                                                    | Generate the human review reference and disclose provenance controls when needed.                                                                        |
| Start a review                            | Seven required metadata fields appeared without enough explanation for a nontechnical reviewer.                                              | Explain which version and context results apply to. Retain required truth constraints; show prior context as named, editable defaults for later reviews. |

# Real-product use

The next pass maintained [ChatGPT desktop app](http://localhost:3000/boards/koxCb-c26Umw/releases) as one product. Separate reviews described actual versions. This agent exercise used StateBoard's browser interface and existing app tools. It was not independent human usability research.[^product-use]

| Observed friction                                                                                                                                                  | Correction                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| A new board said “No release release review yet.”                                                                                                                  | Correct the empty-state heading.                                                                               |
| The release-review form had no visible way to cancel, although Escape worked.                                                                                      | Add **Cancel** and return focus to the opening action.                                                         |
| Official source URLs in a check's method appeared as plain text.                                                                                                   | Make valid HTTP(S) references keyboard-accessible links while retaining the authored method.                   |
| The actual candidate SHA clipped evidence history at 390px.                                                                                                        | Wrap the full reference within the evidence entry.                                                             |
| Another browser retained seven gaps after an external evidence write. Switching sections did not refresh it. Manual Refresh showed six gaps and one passing check. | Refresh live workspaces on return and periodically while visible. Defer read refreshes until open forms close. |

The [installed-candidate review](http://localhost:3000/boards/koxCb-c26Umw/releases/Jy_n1guUy2Hp) covered version `26.1007.21434`, build `13901`, on Linux. At the end of this exercise, it held ten observations: seven passing and three inconclusive. The [historical review](http://localhost:3000/boards/koxCb-c26Umw/releases/shW5cLhuNJH9) covered `26.410`, published on 2026-04-12.[^release-notes] Its four checks had no runtime observations. Current documentation and package metadata did not establish historical behavior.[^product-use]

Project and chat reads succeeded through the app tools. An app-created worktree matched the pinned commit and isolated a temporary marker from the original checkout. Archive and restore succeeded. The restored checkout was clean and its README matched the pinned revision.[^product-use]

File and review opening requests returned queued responses, which did not verify rendered previews. The terminal snapshot was blank, and native-app control was unavailable. These limits constrain the recorded claims. They do not establish that the product features failed.[^product-use]

# Screens and feature links

The screen pass used original OpenAI images to connect visible interface areas with the product's existing features. Native capture remained unavailable. Each image retained its source and limitations.[^screen-use]

The board holds two reference screens, three regions, and three feature mappings. The agent saved each mapping through the region's new inline controls.[^screen-use]

| Region               | Linked product feature                      |
| -------------------- | ------------------------------------------- |
| Project navigation   | Find and continue project work              |
| Built-in browser     | Inspect a local app in the built-in browser |
| Changed-file summary | Review code changes                         |

The browser image shows a conversation beside a local web preview, with a numbered comment on a chart. Its source entry describes release `26.415` on 2026-04-16.[^browser-image] The other image shows project navigation and a new-chat composer. It appears in the 2026-02-02 launch entry. Its downloaded contents have no open review pane, despite the page's alt text.[^project-image]

These are vendor-published references. Mutable image URLs do not establish the exact captured build. Neither image proves behavior in the installed Linux candidate. The current documentation also contains HTML interface mockups, which this pass excluded. A linked region declares where a feature appears. It does not create a passing result.[^screen-use]

| Observed friction                                                           | Required correction                                                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Screens ignored a feature selected in the URL.                              | Restore the selected feature when opening or revisiting the view.                         |
| Manage screens disappeared after the first upload.                          | Keep the management action available in empty and populated states.                       |
| Linked feature names did not open their review context.                     | Let the reviewer follow the link to that feature's checks.                                |
| Region provenance depended on hovering.                                     | Provide the same context through keyboard focus and touch.                                |
| Dense source images were difficult to inspect inside the review.            | Open the original image separately while keeping the review in place.                     |
| A shared screen's feature could appear in a review that did not include it. | Distinguish absent or excluded scope from missing evidence.                               |
| Opening the image editor lost the release return path.                      | Carry the release and selected feature through editing.                                   |
| Screen Actions → Rename dismissed the new input during focus restoration.   | Transfer focus to the input after the menu closes.                                        |
| Linking a region required leaving the image.                                | Put feature linking beside the region and preserve the selected target.                   |
| Arrow keys in the feature picker also moved the selected region.            | Ignore handled key events and interactive controls in global region shortcuts.            |
| Inspector visibility could change the image layout when a gesture began.    | Retain the current inspector layout through every gesture, including unsaved drafts.      |
| Upload and image reuse lacked a consistent visible cancellation action.     | Keep Cancel visible and protect pending saves from dismissal.                             |
| At 390px, the image overlapped the region heading above a tall inspector.   | Stack the image and inspector in normal flow, retaining the image's natural aspect ratio. |

These findings came from actual StateBoard interactions, not inferred persona preferences.[^screen-use] The [screen contracts](../patterns/supporting-surfaces.md#visual-editor) and [interaction rules](../behaviors/interaction.md#location-and-editing) define the resulting behavior. Screens remain optional supporting context in the [release workspace](../patterns/review-workspace.md).

Runtime retests kept the Rename input active and closed the upload dialog through Cancel. The image rectangle stayed constant during drawing. The return breadcrumb preserved the selected feature. These checks covered the stated StateBoard paths and left the recorded two screens, three regions, and three mappings intact.[^screen-use]

Long provenance notes grew to about 440px and pushed feature links below the fold at 1440 × 1000. Limit the notes field to six visible rows and retain its full text through scrolling.[^screen-use]

# Review criteria

Retest the [review workflow](../../product/model.md) without an AI connection. A product manager should explain scope and the current blocker. An engineer should add a check to the selected feature without selecting that feature again. QA should record a result and identify the exact candidate it covers. Operations should find relevant checks without treating an empty category as passed. An owner should distinguish a calculated result from the final human decision.[^application]

Screens, architecture, and AI remain optional for this path. A new candidate still requires fresh applicable observations. Existing records, history, permissions, and readiness rules must survive the simpler presentation. Follow [product readiness](../../product/readiness.md) when evaluating any proposed shortcut.

[^language]: NN/g, familiar vocabulary and natural ordering.

[^recognition]: NN/g, visible cues, contextual help, and limits of tutorials.

[^disclosure]: NN/g, primary/secondary options and the costs of interdependent wizard steps.

[^forms]: GOV.UK, question protocols, relevant branching, and repeated internal work.

[^effort]: NN/g, reducing input through elimination, reuse, and reviewable defaults.

[^tasks]: GOV.UK, simplifying before using task lists and grouping related actions.

[^review]: Simulated role review of board `jjy65JDG6oaF` and candidate `m8M3ZqKHMdvt`. The agents changed no product records.

[^application]: Design choices and review criteria inferred for StateBoard.

[^product-use]: Agent observations from creating and inspecting the real local product board on 2026-10-14. These observations cover the stated paths and candidate only.

[^release-notes]: OpenAI's changelog identifies Codex app 26.410 and its publication date. Release notes describe intended changes, not a runtime test.

[^screen-use]: Agent observations while maintaining board `koxCb-c26Umw` on 2026-10-14. The agent retained official originals and their source manifest locally as ignored browser artifacts.

[^browser-image]: [Original browser image](https://learn.chatgpt.com/images/codex/app/in-app-browser-light.webp), inspected at 3976 × 2688 pixels on 2026-10-14.

[^project-image]: [Original project image](https://learn.chatgpt.com/images/codex/app/codex-app-basic-light.webp), inspected at 3600 × 2026 pixels on 2026-10-14.
