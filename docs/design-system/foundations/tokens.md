---
type: Token Set
title: Review workspace tokens
description: Shared colors, type, spacing, and layout values for the application and design examples.
status: stable
generated: { by: codex/gpt-6, at: 2026-10-13 }
sources:
  - resource: src/lib/theme.ts
  - resource: docs/design-system/references/interface-research.md
tokens:
  colors:
    dark:
      canvas: "#101114"
      surface: "#181a1f"
      primary: "#ff9866"
      onPrimary: "#21140d"
      text: "#edeef2"
      muted: "#adb3c0"
      border: "#2c3039"
      success: "#73cfa0"
      warning: "#e9bc70"
      error: "#f18c91"
      info: "#9ebcff"
    light:
      canvas: "#f5f6f8"
      surface: "#ffffff"
      primary: "#ad4015"
      onPrimary: "#ffffff"
      text: "#242730"
      muted: "#5d6472"
      border: "#dce0e7"
      success: "#23744d"
      warning: "#855e0b"
      error: "#b63746"
      info: "#395eae"
  typography:
    sans: 'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
    title: "1.75rem"
    section: "1rem"
    body: "0.875rem"
    detail: "0.8125rem"
    caption: "0.75rem"
  spacing:
    unit: "8px"
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "32px"
  radius:
    control: "6px"
    panel: "10px"
  layout:
    content: "1440px"
    navigation: "184px"
    header: "60px"
    row: "64px"
  breakpoints:
    compact: "600px"
    medium: "900px"
    workspace: "1200px"
    wide: "1536px"
  motion:
    interaction: "120ms"
examples:
  - tokens.example.html
---

# Roles

The charcoal canvas separates the page from its working surfaces. Orange identifies the primary action and the selected tab on smaller screens. Status colors carry readiness meaning only. Every status also has a text label. Light mode uses the same roles with separate values.

These tokens are the canonical values. `pnpm design:generate` projects them into `src/lib/design-tokens.ts` and [tokens.css](../styles/tokens.css). The MUI theme consumes the generated TypeScript. Edit this source, then regenerate both outputs. `pnpm docs:check` rejects drift.

# Structure

The spacing unit is 8px, with a 4px half-step. Body text is 14px at the default root size. Metadata is 12px. Do not shrink it to fit a column.

The [workspace](../patterns/review-workspace.md) reflows at the shared breakpoints. Controls use a 6px radius. Panels use 10px. Borders establish groups without shadows.

# Examples

The [foundation sheet](tokens.example.html) displays the palette and type hierarchy. The [interaction rules](../behaviors/interaction.md) define focus, keyboard use, and reduced motion.
