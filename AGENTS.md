# Working on StateBoard

This is the canonical agent operating manual. `CLAUDE.md` imports it. Start at the [knowledge base](./docs/index.md) for product and engineering context, and the [design system](./docs/design-system/overview.md) for UI work.

StateBoard helps each role judge release readiness from capabilities, dependencies, checks, and evidence. Screenshots are optional. External agents maintain records. People review intent, unresolved claims, and release decisions. Read [product purpose](./docs/product/purpose.md) before extending scope.

## Work loop

1. Read the request, Git status, relevant code, tests, and knowledge concepts. Reuse the task branch or create a `codex/` branch. Preserve unrelated work and reuse existing local services.
2. Implement a bounded outcome. Delegate independent work with explicit file ownership. Resolve routine choices from the repository and current authorization.
3. Exercise changed behavior. For UI, review the real app at normal and narrow widths, including keyboard use and relevant authenticated/public paths.
4. Update affected instructions, knowledge, design, and published guides in the same change. Follow the synchronization table below.
5. Run focused checks, then every required gate. Fix causes instead of suppressing failures.
6. When assessment upkeep is in scope and credentials exist, reconcile records through REST/MCP. Submit only actual observations for the exact tested candidate.
7. Make small, coherent commits with passing verification. Report the outcome, tests, unresolved facts, and assessment links. A plan or simulated persona alone is not completion.

Routine edits and verification within the task do not require repeated approval. Publication, deployment, unrelated messaging, destructive cleanup, and real release decisions require their own authorization. Missing board credentials do not block independent code work.

## Repository skills

Read the applicable skill before using it. These checked-in copies guide work on this repository:

| Skill                                                      | Apply when                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [React Compiler](./.agents/skills/react-compiler/SKILL.md) | Writing or reviewing React code. The compiler is enabled. Avoid manual memoization unless a documented boundary requires it.   |
| [React Stinky](./.agents/skills/react-stinky/SKILL.md)     | Reviewing component APIs, state, effects, accessibility, TypeScript, or duplication.                                           |
| [OKF](./.agents/skills/okf/SKILL.md)                       | Reading or changing the `docs/` knowledge bundle. Select the narrowest capability.                                             |
| [ODSF](./.agents/skills/odsf/SKILL.md)                     | Reading or changing the design system, tokens, components, patterns, or behavior rules.                                        |
| [No Slop](./.agents/skills/no-slop/SKILL.md)               | Writing human-facing copy, documentation, comments, commits, or errors.                                                        |
| [Agent Browser](./.agents/skills/agent-browser/SKILL.md)   | Browser checks, exploratory testing, and app review when the host permits this CLI. Read `pnpm browser skills get core` first. |

The installable [StateBoard skill](./skills/stateboard/SKILL.md) has a separate audience: agents maintaining another product's StateBoard instance. Keep its workflow consistent with the product API.

For CLI browser work, use the pinned `pnpm browser` command. Load `pnpm browser skills get dogfood` for exploratory testing. Give each task and agent its own named session. Use snapshot refs, refresh the snapshot after page changes, and close only your session.

Save screenshots, recordings, profiles, and explicit state files under ignored `.agents/browser/`. Follow host-required browser tools and permissions when they apply. See [local development](./docs/engineering/local-development.md) for setup and the browser work loop.

## Boundaries to preserve

- [Truth and readiness](./docs/product/readiness.md): exact candidate/context and active check revision determine evidence applicability. Required failures block. Missing, expired, or inconclusive evidence cannot establish ready. Never delete requirements to manufacture a pass.
- [Product records](./docs/product/model.md): source inspection supports declared mappings, not observed behavior. Preserve definitions and append-only evidence. Visual `shipped` means working in production. Simulated personas do not replace human research.
- [Access](./docs/architecture/access.md): scope every relationship to the workspace and board. Revalidate credentials during writes. Release decisions and publication require a current owner session. Views and owner labels grant no permissions.
- [Persistence](./docs/architecture/persistence.md): all application SQL and pools stay in `src/lib/db.ts`. Apply numbered migrations explicitly. Preserve shared locks, revision rules, transactional audit, and retained media.
- [Runtime](./docs/architecture/runtime.md): server code contacts only the configured identity provider. Do not add server-hosted LLMs, test execution, repository polling, or a scheduler for routine upkeep. Keep private media separate from public uploads.
- [API](./docs/architecture/agent-api.md): REST and MCP share validation, roles, scope, evidence retry rules, and credential attribution. Use existing HTTP helpers. Preserve payload limits and matching-origin checks for cookie mutations.
- [UI](./docs/design-system/overview.md): use MUI and Emotion with centralized theme tokens. Fumadocs alone uses scoped Tailwind. Keep conclusions and unresolved claims clear, with details on demand. Use in-memory examples, never sample records in a user's database.

Use the [localization contract](./docs/engineering/localization.md) for all interface copy. Keep English and German catalogs complete, use typed `next-intl` keys and ICU plurals, and format displayed dates and numbers through the active locale. Preserve authored records, API identifiers, URLs, and form state when language changes. Check both languages at narrow widths.

Read version-matched local Next.js guidance before Next-specific edits. Preserve strict TypeScript, `noUncheckedIndexedAccess`, `server-only` boundaries, awaited dynamic parameters, and loading/Suspense shells for request-dependent pages. Cache Components requires explicit caching.

## Keep knowledge and design current

| When changing                                            | Update in the same change                                                                                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work loop, commands, tooling, skill installation         | This file, [engineering knowledge](./docs/engineering/knowledge-maintenance.md), README, and CI where applicable. Keep `CLAUDE.md` as an import.      |
| Product scope or readiness semantics                     | Product concepts, MVP contract, roadmap/usage guide, implementation, and behavior tests.                                                              |
| Persistence, access, REST/MCP, agent workflow            | Architecture concepts, API guide, packaged StateBoard skill, and boundary tests.                                                                      |
| Tokens, layout, components, interaction or copy patterns | ODSF concepts/assets, generated tokens, MUI theme, implementation, and stories.                                                                       |
| Interface copy, localization, or formatting              | Both locale catalogs, the technical glossary, affected stories, localization knowledge, and design interaction rules.                                 |
| A concept's meaning or identity                          | Sources and author/date metadata, direct cross-links, affected index descriptions, and an append-only log entry. Remove obsolete verification claims. |

Use [knowledge maintenance](./docs/engineering/knowledge-maintenance.md) for source ownership and the update procedure. Do not copy a contract into a second competing manual. Code and schemas define executable behavior. Published guides own user instructions. Knowledge concepts explain their relationships.

## Verification

Before committing or reporting completion, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm i18n:check
pnpm test
pnpm test:stories
pnpm build
pnpm docs:check
```

Run `pnpm design:generate` after design-token changes and review the generated diff. Follow [verification](./docs/engineering/verification.md) for database integration, browser, skill, Helm, and static-export checks. `PAGES_BUILD=1 pnpm build:pages` deletes/replaces runtime files: use a disposable checkout or CI.

`pnpm build` also excludes local media and agent inputs, removes generated standalone environment-file copies, and verifies the artifact. `pnpm build:check` repeats the artifact check without changing files. Supply secrets and media through runtime configuration and storage; never bundle them to satisfy file tracing.

Use [local development](./docs/engineering/local-development.md) to start or reuse Postgres, OIDC, the app, and Storybook. `.mcp.json` configures optional development tools, not a credentialed product connection. Keep secrets and machine-specific settings out of commits and logs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
