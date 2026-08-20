"use client";

import { createTheme } from "@mui/material/styles";

/**
 * Type stacks. Geist (sans + mono) is loaded once in the root layout via
 * next/font and exposed as CSS variables on <html> — see src/lib/fonts.ts.
 *
 * The fallbacks matter more than they look: if `--font-geist` is ever
 * undefined (a surface that forgot to load the fonts), CSS treats the whole
 * `font-family` declaration as invalid and drops to the browser default —
 * Times. Naming real system faces after the variable keeps that failure
 * mode at "slightly different grotesque" instead of "newspaper".
 */
export const SANS_FONT =
  'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Use this instead of the bare `monospace` keyword, which resolves to
 * Courier New on Windows. Every ID, token, and coordinate readout in the
 * app should render in Geist Mono, the companion face we already ship.
 */
export const MONO_FONT =
  'var(--font-geist-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * StateBoard's product theme.
 *
 * The pitch is dark-first with a warm-orange accent (the "show, don't tell"
 * brand color from the deck). Light mode is supported but secondary —
 * stakeholders and operators are expected to read these on screens at low
 * brightness during reviews.
 */
const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        background: { default: "#FAF8F5", paper: "#FFFFFF" },
        primary: { main: "#E25A22", contrastText: "#FFFFFF" },
        secondary: { main: "#1A1A1A", contrastText: "#FFFFFF" },
        success: { main: "#1F8A53", contrastText: "#FFFFFF" },
        warning: { main: "#D4A11A", contrastText: "#1A1A1A" },
        error: { main: "#C8412B", contrastText: "#FFFFFF" },
        text: { primary: "#1A1A1A", secondary: "#5A5A5A" },
        divider: "#E4E0DA",
      },
    },
    dark: {
      palette: {
        background: { default: "#0E1418", paper: "#141B20" },
        primary: { main: "#F26B2D", contrastText: "#FFFFFF" },
        secondary: { main: "#E8E8E8", contrastText: "#0E1418" },
        success: { main: "#3DBE6D", contrastText: "#0E1418" },
        warning: { main: "#E9BB36", contrastText: "#0E1418" },
        error: { main: "#E26A50", contrastText: "#FFFFFF" },
        text: { primary: "#ECECEC", secondary: "#9AA3A8" },
        divider: "#1E272D",
      },
    },
  },
  /**
   * Sizes are left at MUI's defaults on purpose — call sites already tune
   * them per surface. What's set here is the part that reads as "designed":
   * optical tracking that tightens as type grows, leading that's roomy for
   * prose and tight for headlines, and one weight step between levels.
   */
  typography: {
    fontFamily: SANS_FONT,
    h1: { fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.08 },
    h2: { fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.12 },
    h3: { fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.18 },
    h4: { fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1.22 },
    h5: { fontWeight: 600, letterSpacing: "-0.018em", lineHeight: 1.3 },
    h6: { fontWeight: 600, letterSpacing: "-0.014em", lineHeight: 1.4 },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.011em" },
    subtitle2: { fontWeight: 600, letterSpacing: "-0.006em" },
    body1: { letterSpacing: "-0.011em", lineHeight: 1.6 },
    body2: { letterSpacing: "-0.006em", lineHeight: 1.6 },
    // Small text needs the opposite treatment: a hair of positive tracking
    // keeps 11–12px legible instead of clotting together.
    caption: { letterSpacing: "0.01em", lineHeight: 1.5 },
    overline: { fontWeight: 600, letterSpacing: "0.08em" },
    button: {
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: "-0.006em",
    },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: "100vh",
          // Geist is drawn for screens; grayscale antialiasing is what keeps
          // it from looking chunky against the dark-first background. Without
          // this, subpixel rendering fattens light-on-dark text noticeably.
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        },
        // Anything genuinely tabular — ids, tokens, counts, coordinates —
        // in the mono face with fixed-width figures so columns line up.
        "code, kbd, samp, pre": {
          fontFamily: MONO_FONT,
          fontVariantNumeric: "tabular-nums",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid var(--mui-palette-divider)",
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: {
          backgroundColor: "var(--mui-palette-background-default)",
          color: "var(--mui-palette-text-primary)",
          borderBottom: "1px solid var(--mui-palette-divider)",
          backgroundImage: "none",
        },
      },
    },
  },
});

export default theme;
