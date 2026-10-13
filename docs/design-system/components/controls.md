---
type: Component
title: Review controls and status
description: Restrained actions and text-labelled readiness states for compact review surfaces.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-13 }
sources:
  - resource: src/lib/theme.ts
  - resource: src/components/release/readiness-summary.tsx
examples:
  - controls.example.html
tokens:
  button-primary:
    backgroundColor: "{colors.dark.primary}"
    textColor: "{colors.dark.onPrimary}"
    radius: "{radius.control}"
---

# Structure

Use one primary action for the current task. Secondary actions use a border or text treatment. Keep icon-only refresh controls labelled. A readiness label contains a dot and text. It never encodes a percentage.

# Variants and states

| Control          | Use                                     | Pending or inactive behavior                                          |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Primary button   | Create or submit the current work       | Disable while its request runs. Keep the action label understandable. |
| Secondary button | Review, inspect, or open context        | Remains visually quieter than the primary action.                     |
| Readiness label  | Ready, Blocked, or Needs evidence       | Always includes text. Evidence changes drive the state.               |
| Disclosure row   | Capability or immutable context details | Retains its title and status while expanded.                          |

# Tokens

Colors, radii, spacing, and type come from the [foundations](../foundations/tokens.md). The MUI theme applies their projections to controls. The [interaction rules](../behaviors/interaction.md) govern keyboard access and failure handling.

# Examples

The [control sheet](controls.example.html) shows the primary and secondary actions, disabled state, and three readiness labels. The [workspace](../patterns/review-workspace.md) shows them in context.
