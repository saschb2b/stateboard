---
type: Reference
title: Release review clarity research
description: UX literature and simulated persona observations behind contextual features, checks, and results.
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
