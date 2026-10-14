---
type: Accessibility
title: Review interactions
description: Keyboard, status, disclosure, screen linking, and return paths for release review.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-14 }
sources:
  - resource: docs/design-system/references/review-clarity-research.md
  - resource: src/components/app/page-breadcrumbs.tsx
  - resource: src/components/board/board-editor.tsx
  - resource: src/components/capability/capability-visual-view.tsx
  - resource: src/components/release/release-perspectives.tsx
  - resource: src/components/screen/region-feature-links.tsx
  - resource: src/components/screen/screen-sidebar.tsx
  - resource: src/components/screen/screen-annotator.tsx
  - resource: src/components/screen/add-screen-dialog.tsx
  - resource: src/lib/screen-editor-context.ts
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
  - resource: src/components/evidence/verification-method.tsx
  - resource: src/components/release/assessment-create-form.tsx
  - resource: src/components/release/use-workspace-refresh.ts
  - resource: src/components/release/mutation-form.tsx
  - resource: src/components/release/decision-panel.tsx
  - resource: src/components/evidence/evidence-history.tsx
  - resource: src/i18n/language-switcher.tsx
  - resource: src/i18n/provider.tsx
  - resource: src/components/release/product-overview.stories.tsx
  - resource: src/lib/theme.ts
  - resource: src/lib/design-tokens.test.ts
---

# Behavior

Overview, Checks, and Decision share one assessment. Screens and Architecture provide supporting context. Category choices, including operations, filter the same checks. The URL retains the selected view. Changing view clears stale check focus. Opening architecture from a capability retains that capability's scope.

A navigation action updates view and focus in one history entry. Back, Forward, and reload restore the URL's view, check, category, capability, and component. Search, result, and needs-attention filters remain local to each view. Preserve this distinction when changing the [workspace](../patterns/review-workspace.md).

Use real buttons, links, tabs, and disclosures. The current tab has `aria-selected`. Its arrow-key behavior follows its orientation. At 1200px and above, view navigation is vertical. Smaller screens use a horizontal, scrollable tab list. Keep an explicit text label on every view.

Each tab connects to its panel through `aria-controls`. The current panel uses `role="tabpanel"`, `aria-labelledby`, and `tabIndex="0"`. Product section URLs use `section`, while assessment perspectives use `view`. Product section changes create browser history entries and preserve unrelated parameters and fragments. Overview omits the section parameter. Invalid section values fall back to Overview.

A category deep link opens its checks and exposes the active category chip even while advanced filters remain hidden. Chip removal and **Reset filters** update the URL. Category changes preserve exact-check focus, unrelated query parameters, and fragments. Browser navigation and reload must restore the category filter. These controls only filter the displayed checks.

The Screens feature filter reads and updates the existing `capability` query parameter. Reload, Back, and Forward restore that selection. Included feature names open the feature's Checks view. **Notes and source** uses a native disclosure beside each annotated region. Keep the authored notes intact and apply the same safe source-link rendering as check methods.

**Open full-size image** opens the original media in a separate tab. Keep this inspection action available to readers. Feature state reflects the selected review's scope. Show **Not in release review** for absent scope and **Excluded** for an explicit exclusion, rather than substituting an evidence state.

Every control has a visible keyboard focus ring. Status labels state Ready, Blocked, or Needs evidence and do not rely on hue alone. Keep label text visible at narrow widths. Wrap long names and references inside their container.

Evidence history retains the full candidate, run, and configuration references. Wrap unbroken hashes at narrow widths rather than clipping or shortening their identities.

Body, metadata, status, and primary-button text must reach a 4.5:1 contrast ratio. Token tests check these pairs in both palettes.

Async actions show pending state, reject duplicate submissions, and report errors next to the action. A failed save must not appear successful. Dialogs retain focus management from MUI. Respect reduced motion through the shared theme.

Check and evidence dialogs keep a labelled Close control above the scrolling form. Closing returns focus to the trigger. Disable Close, Escape, and backdrop dismissal while a save is pending.

Release-review creation exposes **Cancel** beside its submit action. Dismissing the dialog returns focus to the action that opened it. Escape must not be the only discoverable exit.

Check methods preserve authored text and line breaks. Render valid HTTP(S) URLs as native links that open separately with `noopener noreferrer`. Keep other schemes, invalid URLs, and credential-bearing URLs as text. Wrap long references within the container. A source link supplies context. Opening it does not verify the check.

Authenticated product and release workspaces refresh when the visible window receives focus or becomes visible. While visible, they also check for updates every 30 seconds. Manual Refresh remains available. Demos and published snapshots do not use this polling behavior.

Defer automatic and manual read refreshes while any registered form remains open, including before its first edit. Opening a form invalidates in-flight reads, even if the form closes before they return. Keep existing data and unsaved inputs visible. Refresh when the last form closes if the workspace is visible. Otherwise, wait until it becomes visible. A successful local write still updates its workspace.

Keep save errors visible across read refreshes. Clear a transient refresh error after a successful read. Failed saves retain the form and its draft.

Ignore superseded read results and errors. Suspend reads while local writes are pending, so an older response cannot replace a saved change. Revision checks reject obsolete submissions. A decision form retains its opening snapshot while editing, including when time changes evidence applicability. Submission still requires current server validation. The [real-product exercise](../references/review-clarity-research.md#real-product-use) records the external-write staleness that prompted this behavior.

# Contextual entry

Place **Add check** and **Record result** within the expanded release feature. Keep the feature identity visible and carry its known owner and environment into the form. The expected outcome can start the claim, but remains editable. Inherit the active check category, or operational in the Operations filter, so a newly created check remains in view. Secondary settings show their current values before expansion.

Result entry asks what happened and what the reviewer observed. Source and time remain available in details. An automatically assigned manual review reference removes a field without removing attribution or retry identity.

Link a supporting system or screen from its feature. The form inherits the feature rather than asking for it again. Existing record selectors remain available for reuse.

In the image editor, link features directly from the selected region's **Features shown here** section. Put the originating feature first in the available choices. Keep these shortcuts within the same permission, scope, revision, and evidence rules as the full forms. The [clarity study](../references/review-clarity-research.md) explains the distinction between reducing work and hiding required information.

# Location and editing

Use a labelled breadcrumb navigation landmark for the board hierarchy. Desktop shows the ancestor trail, with native links for parent destinations and plain text for the current page. At narrow widths, show the immediate parent with an arrow and a destination label. Keep the current identity in the page heading.

Parent links work when the page opens directly, without prior browser history. Do not add a second Back action beside the trail.

The product's section navigation remains available for sibling destinations. Screens, settings, and history identify their board parent. A release review also links to its review list. Keep editing separate from breadcrumb navigation through a visible **Edit board** action. Follow the [board details contract](../patterns/supporting-surfaces.md#board-details-and-return-paths) for saving, discarding, errors, and draft retention.

In the visual editor, **More board options** keeps the actions that no longer fit in the header. Its menu retains labelled search, sharing, presentation, and checked visual-state filters. Keep the menu and screen-rail expansion reachable by keyboard. The board title remains a location cue. Use **Edit board** for name and description changes.

Release screen actions carry `release` and the selected `capability` into the editor URL. **Edit screen** also carries `screen`. A valid `region` selects an annotation within that image. Resolve all identities against the current board, including the release and the region's parent screen. The editor keeps a breadcrumb return to the release's Screens view and selected feature. The mobile trail exposes that immediate parent.

Screen Actions → Rename transfers focus after the menu closes, so menu focus restoration cannot dismiss the input. Freeze the inspector's current visibility at every gesture start, including when it shows an unsaved draft. Keep that layout through drawing, moving, and resizing, then update after pointer release. A canvas action must not collapse the screen rail. Upload and reuse dialogs retain a visible **Cancel** action, with dismissal and tab changes disabled during saving.

Global region shortcuts ignore handled events and events from interactive controls. Arrow keys inside feature pickers, menus, or fields must not move or resize a region. Keep text editing and control actions within the focused control.

The canvas exposes a labelled **Screen annotations** focus group with a visible theme focus outline. Selecting or drawing on the canvas gives it keyboard focus. Picker typeahead must not trigger presentation or region shortcuts. At narrow widths, keep the image above the inspector without overlap and preserve desktop's side panel.

Use the [wayfinding study](../references/ux-navigation-research.md) for source guidance. Verify desktop and mobile trails with long names, keyboard focus, both languages, and direct deep links. Check Back and Forward after switching product sections or opening a finding from another assessment view. Parent links must update the visible section as well as the address.

# Interface language

The header language control opens a labelled menu with **English** and **Deutsch** in their own languages. Use `menuitemradio` and `aria-checked` to identify the selected language. Retain MUI arrow-key selection, Escape dismissal, and focus return. Use text and a checkmark. Flags do not identify languages.

Language changes preserve open forms, their values, selected views, query parameters, and focus. The document language follows the interface. Locale persistence and deterministic English server rendering follow the [localization contract](../../engineering/localization.md).

Keep the same hierarchy and layout in German. Let technical nouns, labels, and actions wrap inside their containers without clipping or page-wide horizontal overflow. Preserve visible status labels and the distinction between readiness, evidence, and human decisions. Authored names and claims remain unchanged.

# Review

Test keyboard navigation, loading and error states, 390px and desktop layouts, both languages, and both color schemes. Confirm the next action remains clear with missing evidence. The [control examples](../components/controls.md) show the token-based states. Real component stories test behavior.

Check zero, one, and multiple findings in both languages. Change language while a form contains unsaved values. Reload and open a shared assessment to confirm the saved preference and stable URL. The German product-overview story covers long names, optional warnings, disclosure, and category links.
