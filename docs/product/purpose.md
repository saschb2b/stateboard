---
type: Product contract
title: Product purpose
description: Explain the release decision StateBoard supports and the limits of its scope.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-14
sources:
  - resource: docs/design-system/references/review-clarity-research.md
  - id: readme
    resource: "README.md"
  - id: mvp
    resource: "src/content/docs/release-readiness-mvp.mdx"
  - id: roadmap
    resource: "src/content/docs/roadmap.mdx"
---

StateBoard helps a team judge whether a specific product candidate is ready for its intended users. It connects outcomes to implementation, checks, and evidence. Screenshots are an optional view of the same product. Backend outcomes need no screen.[^mvp]

Product managers inspect scope and owners. Engineers inspect dependencies and affected outcomes. QA inspects claims and observations. Operations, security, and data specialists inspect their required checks. A release owner records the decision after reviewing unresolved claims. Each profession reads the same assessment through a different view.[^mvp]

People can maintain a review without an AI connection. Start from the outcomes that should work, define their checks, record observations, and review the decision. The interface calls these outcomes features. Supporting architecture and screens remain optional. The [clarity study](../design-system/references/review-clarity-research.md) records the rationale and its research limits.

The [product model](model.md) defines those records. [Readiness](readiness.md) explains the calculated conclusion and its limits. The [design system](../design-system/overview.md) defines how the review workspace presents them.

StateBoard remains self-hosted and MIT-licensed. External agents and CI maintain records through the [agent API](../architecture/agent-api.md). Runtime server code contacts only the configured identity provider. It does not run tests, fetch evidence URLs, poll repositories, or host an LLM.[^readme]

Ticket and sprint tracking, deployment control, automatic release approval, and a waiver engine are outside the current product scope. Broader imports and portfolio views follow the [roadmap](roadmap.md).[^roadmap]

[^mvp]: The MVP contract defines the problem, users, invariants, and acceptance cases.

[^readme]: README describes deployment and the external-agent model.

[^roadmap]: The adopted roadmap records deferred scope.
