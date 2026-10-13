---
type: Decision rules
title: Release readiness
description: Determine readiness from required checks and exact-context evidence without implying deployment.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T21:15:41Z
sources:
  - id: evaluator
    resource: "src/lib/readiness.ts"
  - id: types
    resource: "src/lib/release-types.ts"
  - id: contract
    resource: "src/content/docs/release-readiness-mvp.mdx"
  - id: db
    resource: "src/lib/db.ts"
---

A ready candidate has at least one included capability. Every included capability needs a required functional check, and every required check needs a fresh matching pass.[^evaluator]

| Conclusion       | Governing condition                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `blocked`        | At least one required check's selected observation failed.                                                                |
| `needs_evidence` | No required failure, but a required check lacks a fresh matching pass, functional coverage is missing, or scope is empty. |
| `ready`          | No required failures or gaps. Optional warnings may remain.                                                               |

## Evidence selection

For each active check, match assessment ID, check ID and revision, candidate reference, expected environment, audience, and configuration. Ignore observations dated after evaluation time. Select the latest `observedAt`, then the highest sequence and ID to break ties.[^evaluator]

A pass remains fresh only while `evaluationTime < observedAt + maxAgeMs`, with a positive lifetime. A selected failure stays a blocker after expiry. An inconclusive result stays a gap. Optional checks create warnings without blocking readiness.[^evaluator]

An older pass arriving after a newer failure cannot clear it. Evidence from another candidate, environment, configuration, or check definition cannot establish the current claim. A component contract test also cannot establish a broader capability outcome by itself.[^contract]

## Human decision

An owner records an approval only when calculated readiness is `ready` and the reviewed assessment revision is current. A hold may record unresolved claims at any readiness. Both need a rationale.[^db]

A decision preserves its reviewed [product model](model.md) and evidence. Later changes do not rewrite that snapshot. Current readiness and historical approval must remain distinct. Approval does not deploy the candidate or change a visual region to `shipped`.[^contract]

API keys cannot record decisions or publish release review links. [Access and sharing](../architecture/access.md) defines that boundary. [Verification](../engineering/verification.md) describes the checks developers run before recording observations.

[^evaluator]: `evaluateRelease` implements selection, freshness, warnings, blockers, and coverage gaps.

[^types]: Release evidence and evaluation record fields.

[^contract]: MVP truth boundaries and acceptance cases.

[^db]: Decision transaction validates current owner, revision, and readiness.
