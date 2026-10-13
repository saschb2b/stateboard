---
type: Security boundary
title: Access and sharing
description: Apply workspace roles, API-key limits, mutation origin checks, and public disclosure rules.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-13T21:15:41Z
sources:
  - id: auth
    resource: "src/lib/auth-helpers.ts"
  - id: keys
    resource: "src/lib/api-keys.ts"
  - id: security
    resource: "src/lib/release-security.ts"
  - id: db
    resource: "src/lib/db.ts"
  - id: projection
    resource: "src/lib/release-projection.ts"
  - id: mcp
    resource: "src/app/api/mcp/route.ts"
---

Every private record and nested relationship must resolve inside the authenticated workspace and correct board. Profession views change presentation, not access. Owner labels do not grant permission.[^auth]

| Principal     | Allowed operations                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Viewer        | Read internal boards, product context, and assessments in the workspace.                                                           |
| Editor        | Maintain ordinary product records, scope, checks, and evidence.                                                                    |
| Owner session | Editor operations plus release decisions and release review publication/revocation.                                                |
| API key       | Ordinary operations capped by both key role and current member role. No release decision or release review publication/revocation. |

Use `requirePageMember` and `requireApiMember` for ordinary access. Release routes use `requireReleaseApiMember` with the session-only owner option for final decisions and publication. Cookie-authenticated mutations require the deployment's matching origin.[^auth]

MCP at `/api/mcp` accepts a bearer API key with no cookie fallback. Key management requires a session. Secrets and hashes must never enter result payloads or audit metadata.[^mcp]

Release mutation transactions revalidate membership, role, key ownership, expiry, and revocation. Preserve these checks when adding an adapter. A principal cached before demotion or revocation must not retain write access.[^db]

## Public output

Visual board links expose the visual board. Legacy screenshot URLs remain public and cached when known. Confidential release images use separate authenticated storage. Retaining a private copy does not retract a previously public screenshot.[^db]

Release review links expose an immutable, server-built allowlist from a recorded decision. Owners choose public text and safe retained images. Internal checks, architecture, evidence URLs, run IDs, and private member details stay outside the public projection.[^projection]

Apply the same token and revocation checks to HTML, JSON, metadata, and media reads. UI hiding alone does not prevent disclosure. Revocation blocks subsequent reads but cannot retract bytes already downloaded.[^projection]

[Readiness](../product/readiness.md) governs approvals. [Persistence](persistence.md) preserves snapshots and image retention. [Agent maintenance](agent-api.md) uses ordinary edit permissions.

[^auth]: Page/API role guards and release session requirements.

[^keys]: API-key generation and hashing.

[^security]: Matching-origin mutation validation.

[^db]: Live credential checks, retained records, and scoped reads/writes.

[^projection]: Public review allowlist.

[^mcp]: API-key-only MCP route.
