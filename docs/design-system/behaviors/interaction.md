---
type: Accessibility
title: Review interactions
description: Keyboard, status, disclosure, and responsive behavior for release review.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-13 }
sources:
  - resource: src/components/release/workspace-navigation.tsx
  - resource: src/components/release/use-release-view.ts
  - resource: src/lib/theme.ts
---

# Behavior

Views change the presentation of one assessment. The URL retains the selected view. Changing view clears stale check focus. Opening architecture from a capability retains that capability's scope. Preserve these behaviors when changing the [workspace](../patterns/review-workspace.md).

Use real buttons, links, tabs, and disclosures. The current tab has `aria-selected`. Its arrow-key behavior follows its orientation. At 1200px and above, view navigation is vertical. Smaller screens use a horizontal, scrollable tab list. Keep an explicit text label on every view.

Every control has a visible keyboard focus ring. Status labels state Ready, Blocked, or Needs evidence and do not rely on hue alone. Keep label text visible at narrow widths. Wrap long names and references inside their container.

Async actions show pending state, reject duplicate submissions, and report errors next to the action. A failed save must not appear successful. Dialogs retain focus management from MUI. Respect reduced motion through the shared theme.

# Review

Test keyboard navigation, loading and error states, 390px and desktop layouts, and both color schemes. Confirm the next action remains clear with missing evidence. The [control examples](../components/controls.md) show the token-based states. Real component stories test behavior.
