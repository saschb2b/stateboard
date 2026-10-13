---
type: Implementation guide
title: Interface localization
description: Maintain English and German interface messages without changing product records, URLs, or agent contracts.
status: stable
generated:
  by: codex/gpt-6
  at: 2026-10-14
sources:
  - id: request
    resource: "User request on 2026-10-14: English and German interface options with technically correct translations."
  - id: provider
    resource: src/i18n/provider.tsx
  - id: config
    resource: src/i18n/config.ts
  - id: catalogs
    resource: src/i18n/catalog.ts
  - id: types
    resource: src/i18n/types.d.ts
  - id: switcher
    resource: src/i18n/language-switcher.tsx
  - id: shell
    resource: src/components/app/client-shell.tsx
  - id: reasons
    resource: src/components/release/use-release-reason.ts
  - id: storybook
    resource: .storybook/preview.tsx
  - id: messages-guide
    resource: https://next-intl.dev/docs/usage/translations
  - id: provider-guide
    resource: https://next-intl.dev/docs/usage/configuration
  - id: formatting-guide
    resource: https://next-intl.dev/docs/usage/dates-times
  - id: types-guide
    resource: https://next-intl.dev/docs/workflows/typescript
---

StateBoard offers English and German interface text through `next-intl`. Add messages to both locale catalogs whenever an interface changes. Keep authored product content and API identifiers intact.[^request][^catalogs]

## Locale and rendering

English (`en`) is the default. The language menu offers **English** and **Deutsch** (`de`) and saves the selection in this browser under `stateboard.locale`. Tabs on the same origin share the saved preference. Unsupported values fall back to English. If browser storage is unavailable, the current session retains the selection.[^config][^provider]

Server rendering and static export use deterministic English output. Hydration reads the saved browser preference and applies German when selected. A reload can briefly show English before the saved language appears. The preference does not require request cookies, locale routes, redirects, or a database field. The document's `lang` follows the active interface language.[^provider]

Changing language updates message and MUI locale context without remounting forms or changing navigation. Paths, query parameters, fragments, selected assessment views, and unsaved field values remain intact. Existing shared links work in either interface language. Language choice changes presentation, never access or release-readiness rules.[^provider][^shell]

The client provider supplies the locale, catalogs, and an explicit UTC time zone. Date ordering and numeric separators follow the active locale. Evidence times and release decisions refer to the same stored instant. Render audit-relevant times with a visible UTC designation.[^provider][^formatting-guide]

## Message ownership

`src/i18n/messages/en/` and `src/i18n/messages/de/` contain matching JSON namespaces. `catalog.ts` combines them. English catalog types constrain message keys through the `next-intl` `AppConfig` augmentation.[^catalogs][^types][^types-guide]

Use `useTranslations` with a semantic namespace and key. Use ICU interpolation and plural rules for complete sentences and counts. Place singular and plural grammar in the message rather than concatenating English word endings. Use `useFormatter` for displayed dates and numbers.[^messages-guide][^formatting-guide]

Translate visible labels, accessible names, helper text, empty states, local validation, status text, and action feedback. Translate enum values only where they become display labels. Keep mutation payloads, database values, scope identifiers, evidence results, URLs, and exports compatible with the existing contracts.

Authored names, outcomes, claims, notes, relations, owner labels, environments, and rationale remain as entered. The release-reason adapter translates only known evaluator messages. Unknown diagnostics pass through. REST/MCP responses, server diagnostics, published documentation, static page metadata, and retained user content remain in their original language.[^reasons]

MUI receives the selected component locale. Sign-in screens owned by an external identity provider follow that provider's configuration. The application language menu does not change the identity provider or workspace settings.[^shell]

## Technical glossary

Use these terms consistently. Inflect nouns and adjectives for their sentence. Short view labels can omit “Release” where the surrounding assessment provides the context.

| English                           | German                                   | Meaning                                                                                      |
| --------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Release readiness                 | Release-Bereitschaft                     | Result derived from applicable required checks.                                              |
| Release assessment                | Release-Bewertung                        | Review of one candidate in a fixed context.                                                  |
| Capability                        | Fähigkeit                                | A product outcome someone needs to achieve.                                                  |
| Component                         | Komponente                               | A declared part of the product architecture.                                                 |
| Dependency                        | Abhängigkeit                             | A declared relationship between required or supporting components.                           |
| Evidence                          | Nachweis                                 | An observation relevant to a check revision and context.                                     |
| Check                             | Prüfung                                  | A versioned claim with acceptance criteria.                                                  |
| Acceptance check                  | Abnahmeprüfung                           | A check used to establish required behavior.                                                 |
| Required / optional               | Erforderlich / optional                  | Whether a check gates readiness.                                                             |
| Validation environment            | Prüfumgebung                             | Environment in which a check is evaluated.                                                   |
| Target environment                | Zielumgebung                             | Environment the candidate is intended to reach.                                              |
| Ready                             | Bereit                                   | Required applicable checks pass.                                                             |
| Blocked                           | Blockiert                                | A required check has failed.                                                                 |
| Needs evidence                    | Nachweise fehlen                         | Current evidence does not establish readiness.                                               |
| Approved / held                   | Freigegeben / Freigabe zurückgestellt    | Recorded human release decision.                                                             |
| Functional / integration / UX     | Funktional / Integration / Bedienbarkeit | Check categories; overview may use Funktionalität as its area label.                         |
| Data / security / operations      | Daten / Sicherheit / Betrieb             | Remaining check categories.                                                                  |
| Workspace owner / editor / viewer | Inhaber / Bearbeitung / Lesen            | Display names for unchanged authorization roles.                                             |
| Accountable owner                 | Verantwortliche Person                   | Assigned responsibility for a capability, component, or release; does not grant permissions. |

“Bereit” does not mean deployed or approved. Visual production state remains distinct from candidate verification. Preserve that distinction from [release readiness](../product/readiness.md) in every language.

## Verification and maintenance

Run `pnpm i18n:check` with the [verification gates](verification.md). Catalog checks detect structural or ICU mistakes. They cannot determine whether a translation is technically correct.

Review both locales at desktop and 390px widths. Include long names, wrapped actions, zero/one/many counts, accessible menu labels, keyboard selection, and date presentation. Change language with an open form and confirm its values remain. Reload and navigate between views to check saved preference and URL stability.

Storybook's language toolbar sets the preview locale. A story can set `parameters.locale` to `de` for a fixed German regression case. Story previews do not persist a browser preference.[^storybook]

Apply [knowledge maintenance](knowledge-maintenance.md) when locale behavior or terminology changes. Keep the [interaction rules](../design-system/behaviors/interaction.md), catalogs, tests, and user instructions synchronized.

[^request]: The user's requested language pair and translation quality.

[^provider]: Client preference storage, subscription, hydration snapshot, and formatting context.

[^config]: Supported locales, fallback, and storage key.

[^catalogs]: Namespace assembly and locale catalog locations.

[^types]: Repository TypeScript augmentation for translated keys and locales.

[^switcher]: Language choices and accessible menu semantics.

[^shell]: MUI locale integration inside the application shell.

[^reasons]: Narrow adapter for evaluator-owned diagnostic phrases.

[^storybook]: Locale preview controls and isolated story provider.

[^messages-guide]: Official next-intl message namespaces, interpolation, and ICU plurals.

[^provider-guide]: Official provider configuration and locale context.

[^formatting-guide]: Official locale-aware date formatting and explicit time zones.

[^types-guide]: Official AppConfig augmentation for locale and message types.
