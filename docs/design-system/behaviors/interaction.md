---
type: Accessibility
title: Review interactions
description: Keyboard, status, disclosure, and responsive behavior for release review.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: src/components/board/board-editor.tsx
  - resource: src/components/release/release-location.ts
  - resource: src/components/board/board-settings.tsx
  - resource: src/components/release/use-release-navigation.ts
  - resource: docs/design-system/references/ux-navigation-research.md
  - resource: src/components/release/workspace-navigation.tsx
  - resource: src/components/release/use-release-view.ts
  - resource: src/components/release/use-product-section.ts
  - resource: src/components/release/use-check-focus.ts
  - resource: src/components/evidence/check-filters.tsx
  - resource: src/components/evidence/check-manager.tsx
  - resource: src/i18n/language-switcher.tsx
  - resource: src/i18n/provider.tsx
  - resource: src/components/release/product-overview.stories.tsx
  - resource: src/lib/theme.ts
  - resource: src/lib/design-tokens.test.ts
---

# Behavior

Views change the presentation of one assessment. The URL retains the selected view. Changing view clears stale check focus. Opening architecture from a capability retains that capability's scope.

A navigation action updates view and focus in one history entry. Back, Forward, and reload restore the URL's view, check, category, capability, and component. Search, result, and needs-attention filters remain local to each view. Preserve this distinction when changing the [workspace](../patterns/review-workspace.md).

Use real buttons, links, tabs, and disclosures. The current tab has `aria-selected`. Its arrow-key behavior follows its orientation. At 1200px and above, view navigation is vertical. Smaller screens use a horizontal, scrollable tab list. Keep an explicit text label on every view.

Each tab connects to its panel through `aria-controls`. The current panel uses `role="tabpanel"`, `aria-labelledby`, and `tabIndex="0"`. Product section URLs use `section`, while assessment perspectives use `view`. Product section changes create browser history entries and preserve unrelated parameters and fragments. Overview omits the section parameter. Invalid section values fall back to Overview.

A category deep link opens its checks and exposes the active category chip even while advanced filters remain hidden. Chip removal and **Reset filters** update the URL. Category changes preserve exact-check focus, unrelated query parameters, and fragments. Browser navigation and reload must restore the category filter. These controls only filter the displayed checks.

Every control has a visible keyboard focus ring. Status labels state Ready, Blocked, or Needs evidence and do not rely on hue alone. Keep label text visible at narrow widths. Wrap long names and references inside their container.

Body, metadata, status, and primary-button text must reach a 4.5:1 contrast ratio. Token tests check these pairs in both palettes.

Async actions show pending state, reject duplicate submissions, and report errors next to the action. A failed save must not appear successful. Dialogs retain focus management from MUI. Respect reduced motion through the shared theme.

Check and evidence dialogs keep a labelled Close control above the scrolling form. Closing returns focus to the trigger. Disable Close, Escape, and backdrop dismissal while a save is pending.

# Location and editing

Use a labelled breadcrumb navigation landmark for the board hierarchy. Desktop shows the ancestor trail, with native links for parent destinations and plain text for the current page. At narrow widths, show the immediate parent with an arrow and a destination label. Keep the current identity in the page heading.

Parent links work when the page opens directly, without prior browser history. Do not add a second Back action beside the trail.

The product's section navigation remains available for sibling destinations. Screens, settings, and history identify their board parent. An assessment also links to its assessment list. Keep editing separate from breadcrumb navigation through a visible **Edit board** action. Follow the [board details contract](../patterns/supporting-surfaces.md#board-details-and-return-paths) for saving, discarding, errors, and draft retention.

In the visual editor, **More board options** keeps the actions that no longer fit in the header. Its menu retains labelled search, sharing, presentation, and checked visual-state filters. Keep the menu and screen-rail expansion reachable by keyboard. The board title remains a location cue. Use **Edit board** for name and description changes.

Use the [wayfinding study](../references/ux-navigation-research.md) for source guidance. Verify desktop and mobile trails with long names, keyboard focus, both languages, and direct deep links. Check Back and Forward after switching product sections or opening a finding from another assessment view. Parent links must update the visible section as well as the address.

# Interface language

The header language control opens a labelled menu with **English** and **Deutsch** in their own languages. Use `menuitemradio` and `aria-checked` to identify the selected language. Retain MUI arrow-key selection, Escape dismissal, and focus return. Use text and a checkmark. Flags do not identify languages.

Language changes preserve open forms, their values, selected views, query parameters, and focus. The document language follows the interface. Locale persistence and deterministic English server rendering follow the [localization contract](../../engineering/localization.md).

Keep the same hierarchy and layout in German. Let technical nouns, labels, and actions wrap inside their containers without clipping or page-wide horizontal overflow. Preserve visible status labels and the distinction between readiness, evidence, and human decisions. Authored names and claims remain unchanged.

# Review

Test keyboard navigation, loading and error states, 390px and desktop layouts, both languages, and both color schemes. Confirm the next action remains clear with missing evidence. The [control examples](../components/controls.md) show the token-based states. Real component stories test behavior.

Check zero, one, and multiple findings in both languages. Change language while a form contains unsaved values. Reload and open a shared assessment to confirm the saved preference and stable URL. The German product-overview story covers long names, optional warnings, disclosure, and category links.
