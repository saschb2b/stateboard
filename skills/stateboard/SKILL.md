---
name: stateboard
description: Maintain a team's self-hosted StateBoard product and release assessments from repository changes and actual verification. Use when asked to set up or update StateBoard, map capabilities and dependencies, submit check evidence, assess release readiness, or annotate screenshots for a StateBoard instance.
---

# StateBoard

Keep a useful assessment current while doing the engineering work. A board represents a product; capabilities describe outcomes, components and dependencies explain their implementation, and versioned checks plus evidence establish release readiness. Screenshots and regions are optional visual anchors. People should review the conclusion and unresolved judgments, not transcribe the repository into forms.

## Connect and inspect

Use the configured instance URL and credential from the current environment or project instructions. Never print or commit secrets. If no credential is configured, a member creates an **editor** API key at `{instance}/settings/api-keys`; a viewer key supports read-only assessment. Key creation and revocation require a browser session. Keys act as their creator, capped by their current role, and normally expire after 90 days.

Prefer the instance's MCP endpoint at `{instance}/api/mcp`, authenticated with `Authorization: Bearer $STATEBOARD_API_KEY`. For example:

```bash
claude mcp add --transport http stateboard "$STATEBOARD_URL/api/mcp" \
  --header "Authorization: Bearer $STATEBOARD_API_KEY"
```

Use tool discovery for the installed version's input schemas. The published `2026.8.0` version only has visual tools; release tools require the release-readiness build. Read `list_boards`, then `get_product(board_id)` and the relevant `get_release(release_id)` before writing. Product context includes reusable capabilities/components, relationships, optional regions, and existing assessments. A release workspace includes its immutable context, revision, scope, checks, evidence, decisions, and calculated readiness. `get_release_readiness` refreshes the evaluation; `get_check_history` retrieves prior definitions and observations.

REST uses the same bearer credential and authorization. Read `/api/boards/BOARD_ID/product` and `/api/releases/RELEASE_ID`. File uploads use REST; ordinary readiness maintenance is available through either surface.

## Build and reconcile the assessment

When asked to establish or maintain a board, inspect the relevant repository, interfaces, test definitions, deployment configuration, and actual run results. Work within the requested product/change scope.

- **Describe outcomes.** Derive a small set of meaningful capabilities from implemented user or business flows, including background jobs and API-only work. A file or endpoint is usually an implementation detail rather than a capability.
- **Reuse identities.** Match existing records by their outcome, implementation, and reference before creating anything. Reuse IDs, update changed definitions, and add missing relationships. Renames are updates, not new capabilities. Creates are not universally idempotent. If the outcome is unknown, re-read and reconcile matching records rather than blindly retrying; surface ambiguous concurrent duplicates instead of guessing which record to keep.
- **Explain the wiring.** Record only relevant components and explicit calls, events, data requirements, or jobs. Put a concise source reference and the basis for a mapping in its description or interface reference. Source-derived relationships are declared architecture; they are not observed runtime behavior or passing evidence. Dependencies upsert by consumer ID, provider ID, and exact relation text: preserve that text for description-only edits and retries. For a deliberate semantic replacement, create the replacement and delete the obsolete edge by its existing ID; rephrasing alone creates another edge.
- **Keep uncertainty visible.** Use known team ownership and scope from the repository or task. Do not invent an accountable person, target environment, audience, or feature-flag configuration. Infer routine details where sources support them and proceed; ask only when a missing fact materially changes the assessment. Continue independent inspection while that fact is unresolved.
- **Choose the exact candidate.** Pin and preserve the exact source snapshot, built artifact, or manifest and relevant configuration before verification. Dirty-worktree results cannot be attributed to the base commit or `HEAD`. If the tested snapshot was not preserved, rerun against a pinned candidate; keep and report earlier failure logs as unattributed observations rather than fabricating evidence or forcing a commit. A changed candidate, validation/target environment, audience, or configuration requires a new assessment. Do not relabel old passing evidence as a new candidate's verification.
- **Maintain acceptance claims.** Every included capability needs a required functional check describing an observable outcome and verification method. Add relevant integration, security, data, UX, or operational checks. Component connections alone create no gates. Revise an existing check when its claim changes; move a claim to another subject by creating a new check. Adopting a changed capability definition into a live scope is explicit and invalidates affected evidence. `create_release` starts with no checks: reconcile every still-applicable prior capability, component, and release requirement into new check IDs. Preserve required status, claim, method, environment, and freshness where applicable; explain changes for the new scope/context. Copy no evidence.

Use `create/update/archive_capability`, `create/update/archive_component`, `link/unlink_capability_component`, `create/delete_dependency`, and `link/unlink_region_capability` as appropriate. Create assessments with `create_release`, maintain inclusion with `set_release_scope`, and use `create_check`, `revise_check`, and `archive_check` for definitions. Archive superseded records when the maintenance task warrants it; preserve history. Do not remove or downgrade a failed requirement simply to produce a ready result.

Product mutations take `board_id`, the applicable top-level `capability_id`, `component_id`, or `dependency_id` where required, and nested `data` using camelCase REST fields. Release mutations take `release_id`, `expected_revision`, and nested `data`; check edits also take `check_id`. Capability updates include the current `definitionRevision` in `data`. Successful readiness calls return the updated context in `structuredContent.data`. Use its `assessment.revision` for the next release write. Shared product edits can also advance assessment revisions, so refresh the release after changing its wiring.

## Verify and submit evidence

Run the relevant existing checks in the external development or CI environment as authorized by the task. StateBoard stores observations; it does not execute tests or fetch evidence URLs.

For each actual observation, use `submit_evidence` with the current assessment revision and:

- `checkId` and active `checkRevision`;
- exact `candidateRef`, `audience`, and `configurationRef` copied from the assessment;
- the check's expected `environment`, matching where verification actually ran;
- `result`: `pass`, `fail`, or `inconclusive`, with a concise `summary` of the observed claim;
- actual verification time as `observedAt` in Unix milliseconds;
- meaningful `source`, `runRef`, and stable `eventId`; optional HTTP(S) `referenceUrl`.

A test name, source inspection, successful build, or simulated persona cannot substitute for an unexecuted end-to-end claim, production rehearsal, or independent human review. Leave evidence absent when no observation was made; use `inconclusive` when an actual attempt cannot establish the claim. Report failed results as faithfully as passes. Evidence belongs in check records, not only in visual region notes.

Retry an uncertain evidence submission with the **same event identity and unchanged payload**. An identical retry returns the original observation; changed data under the same identity conflicts. On a revision conflict, re-read the workspace and check definition. Reuse a result only if it still verifies the same claim and context; otherwise rerun or leave a gap. Retry a reconciled mutation once; if competing edits continue, report the conflict rather than overwriting them. Invalid input needs correction; a denied or expired credential needs an authorized replacement, not repeated calls.

Finish by reading calculated readiness, checking that changed capabilities and required gates are represented, and returning the internal assessment link `{instance}/boards/{boardId}/releases/{releaseId}` with blockers/gaps and the next needed verification. Readiness is `ready`, `blocked`, or `needs_evidence`; it is never an editable badge. The same assessment powers all role views.

## Maintain after changes

On a subsequent authorized coding task, reconcile the affected capabilities, definitions, and wiring; submit new observations for the exact candidate tested. Prefer a bounded update tied to that change or a CI run over rewriting the whole product. CI can push the same evidence format through REST. Do not install a scheduler or external connector merely to maintain a board.

A current human owner records approval/hold and publishes or revokes a curated release review in the browser. API keys, including owner-scoped keys, cannot perform these actions. Present the assessment for that decision; do not impersonate a human reviewer or automatically publish a visual share link as a substitute.

## Optional visual anchors

Keep the existing visual semantics independent from candidate readiness:

| State     | Meaning                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------- |
| `shipped` | Real and working in production for the intended users. A local or staging pass is insufficient. |
| `mock`    | Looks real but is faked, stubbed, or not connected.                                             |
| `missing` | Not built yet.                                                                                  |

Do not invent a fourth state or mark a region shipped from a merge/build alone. If the available facts do not justify a change, retain its state and explain the uncertainty. Region labels stay short; plaintext notes explain their visual status. Coordinates `x`, `y`, `w`, `h` are fractions in `[0, 1]`, never pixels.

Upload a screen using `POST /api/boards/BOARD_ID/screens` with multipart `file` and `label` (PNG/JPEG/WebP/GIF, up to 25 MB). Board screens and their existing share links are public visual content. Use authenticated `POST /api/releases/RELEASE_ID/assets` for confidential release images. Link regions to capabilities when that aids navigation; a capability never requires a screenshot. Visual share links do not publish release assessments. Create or distribute links only within the user's requested sharing scope.
