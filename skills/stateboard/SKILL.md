---
name: stateboard
description: Report visual product status to a team's self-hosted StateBoard instance — the tool where stakeholders read screenshots annotated with shipped / mock / missing regions instead of tickets. Covers connecting an agent (API key + MCP server or REST), the three-state semantics, normalized [0,1] region coordinates, uploading screenshots, and the discipline of verifying a feature actually works before flipping its region to shipped. Use when the team runs StateBoard and a task changes what a user can see or do (shipping a feature, discovering something is mocked or broken, finishing a milestone), when asked to update the status board / stateboard, when asked to create or annotate a board from screenshots, or when asked to produce a stakeholder-readable status link. Triggers on mentions of StateBoard, "update the board", "mark it shipped", region states, or share links for status reporting.
tags: [status, reporting, mcp, integration]
date: 2026-08-13
---

# StateBoard

StateBoard is a self-hosted status tool built on one primitive: **(screen, rectangle, state)**. A board holds screenshots of a product; rectangles ("regions") painted on them carry exactly one of three states. Stakeholders read the result at a public share link with no login. Your job as an agent is to keep those regions truthful and hand back the share link.

## The three states (never invent a fourth)

| State     | Meaning                                                                     |
| --------- | --------------------------------------------------------------------------- |
| `shipped` | Real and working. A user can do this today.                                 |
| `mock`    | Looks real but is faked — hardcoded data, stubbed integration, dead button. |
| `missing` | Not built yet. Empty space or a gap in the flow.                            |

These are deliberately blunt. Do not soften `missing` to "planned", do not add "in progress", do not rename. If reality is ambiguous, `mock` is usually the honest answer.

## Connect

You need two things from the user (or the repo's env/config — check `.env*`, CI secrets docs, or `CLAUDE.md`/`AGENTS.md` first before asking):

- **Instance URL** — e.g. `https://stateboard.internal.example.com`
- **API key** — a member mints one at `{instance}/settings/api-keys` (avatar menu → API keys). Keys look like `sbk_…`, act as their creator, and carry a role: `viewer` reads, `editor` writes. Ask for an `editor` key if the task updates regions. Keys expire (90 days by default), so a long-dormant key failing with 401 is likely expired, not misconfigured.

Never commit the key. Prefer an env var like `STATEBOARD_API_KEY`.

### Preferred: MCP

```bash
claude mcp add --transport http stateboard "$STATEBOARD_URL/api/mcp" \
  --header "Authorization: Bearer $STATEBOARD_API_KEY"
```

The server then self-describes: `list_boards` (with per-state counts), `get_board` (full screens + regions), `create_board`, `update_board`, `create_region`, `update_region`, `delete_region`, `list_share_links`, `create_share_link`.

### Fallback: REST

Every route accepts `Authorization: Bearer sbk_…`. Nouns are plural, errors are `{ "error": "…" }`.

```bash
curl -H "Authorization: Bearer $STATEBOARD_API_KEY" $STATEBOARD_URL/api/boards          # list
curl -H "Authorization: Bearer $STATEBOARD_API_KEY" $STATEBOARD_URL/api/boards/BOARD_ID # deep view
curl -X PATCH -H "Authorization: Bearer $STATEBOARD_API_KEY" -H "content-type: application/json" \
  -d '{"state":"shipped"}' $STATEBOARD_URL/api/regions/REGION_ID
```

**Screenshots are REST-only** (MCP tools don't carry image bytes). One multipart call creates the screen:

```bash
curl -X POST -H "Authorization: Bearer $STATEBOARD_API_KEY" \
  -F "file=@dashboard.png" -F "label=Dashboard" \
  $STATEBOARD_URL/api/boards/BOARD_ID/screens
```

PNG / JPEG / WebP / GIF, max 25 MB.

## Rules

1. **Verify before you flip to `shipped`.** Run the app, the test, or the build — a merged PR is not a shipped feature. If you can't verify, say so and leave the state alone or set `mock` with a note explaining why.
2. **Coordinates are normalized to [0, 1].** `{x, y}` is the rectangle's top-left as a fraction of the screenshot, `{w, h}` its size. `{"x":0.1,"y":0.2,"w":0.3,"h":0.15}` = 10% from the left, 20% from the top. Never send pixels; the server rejects out-of-range values.
3. **Put evidence in `notes`, not prose in labels.** Labels are short names ("Checkout button"); notes are plaintext and appear on the share view — a good note says _why_ the state is what it is ("returns hardcoded fixtures; API lands in #482").
4. **Don't restructure boards you didn't create.** Update region states and notes freely; renaming boards, deleting regions, or reshuffling screens is the team's call — propose it instead.
5. **End with the artifact.** After updating statuses, fetch or mint a share link (`create_share_link` / `list_share_links`) and put `{instance}/share/{token}` in your summary. The share link _is_ the status report.
6. **Every write is audited** under the key owner's name with a `via: "mcp"` marker — edit as carefully as you would in their browser.

## Common flows

**After shipping a feature:** `list_boards` → `get_board` for the relevant board → find the region(s) covering the changed UI → verify the feature works → `update_region` with `state: "shipped"` and a note naming the commit/PR → report the share link.

**Status sweep:** `get_board` → for each `mock`/`missing` region, check the codebase for whether reality moved → update states with evidence notes → summarize flips in your report.

**New board from screenshots:** `create_board` (name like "Acme Dashboard / Q3 2026" — teams name boards by product + period) → upload each screenshot via REST → `create_region` per meaningful UI area with honest states → share link.

## Errors

- `401 Invalid, expired, or revoked API key` — the key is dead (keys expire after 90 days by default); ask the user for a fresh one. Do not retry.
- `403 Requires editor role` — the key is `viewer`-scoped; ask for an editor key rather than working around it.
- `403 API keys can't manage API keys` — by design; key management needs a browser session.
