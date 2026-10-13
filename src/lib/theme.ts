"use client";

import { createTheme } from "@mui/material/styles";
import { designTokens as tokens } from "./design-tokens";

export const SANS_FONT = tokens.typography.sans;
export const MONO_FONT = tokens.typography.mono;

function palette(mode: "light" | "dark") {
  const color = tokens.colors[mode];
  return {
    background: { default: color.canvas, paper: color.surface },
    primary: { main: color.primary, contrastText: color.onPrimary },
    secondary: { main: color.text, contrastText: color.canvas },
    success: { main: color.success, contrastText: color.canvas },
    warning: { main: color.warning, contrastText: color.canvas },
    error: { main: color.error, contrastText: color.canvas },
    info: { main: color.info, contrastText: color.canvas },
    text: { primary: color.text, secondary: color.muted },
    divider: color.border,
  };
}

/** ODSF foundations own the values; this file maps them to MUI roles. */
const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: { palette: palette("light") },
    dark: { palette: palette("dark") },
  },
  spacing: Number.parseFloat(tokens.spacing.unit),
  breakpoints: {
    values: {
      xs: 0,
      sm: Number.parseFloat(tokens.breakpoints.compact),
      md: Number.parseFloat(tokens.breakpoints.medium),
      lg: Number.parseFloat(tokens.breakpoints.workspace),
      xl: Number.parseFloat(tokens.breakpoints.wide),
    },
  },
  typography: {
    fontFamily: SANS_FONT,
    h1: { fontWeight: 650, letterSpacing: "-0.04em", lineHeight: 1.1 },
    h2: { fontWeight: 650, letterSpacing: "-0.035em", lineHeight: 1.15 },
    h3: { fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.2 },
    h4: { fontWeight: 650, letterSpacing: "-0.025em", lineHeight: 1.25 },
    h5: {
      fontSize: tokens.typography.title,
      fontWeight: 600,
      letterSpacing: "-0.03em",
      lineHeight: 1.3,
    },
    h6: {
      fontSize: "1.125rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: tokens.typography.section,
      fontWeight: 600,
      letterSpacing: "-0.015em",
    },
    subtitle2: {
      fontSize: tokens.typography.body,
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    body1: {
      fontSize: tokens.typography.body,
      letterSpacing: "-0.005em",
      lineHeight: 1.65,
    },
    body2: {
      fontSize: tokens.typography.detail,
      letterSpacing: "-0.003em",
      lineHeight: 1.6,
    },
    caption: { fontSize: tokens.typography.caption, lineHeight: 1.5 },
    overline: {
      fontSize: tokens.typography.caption,
      fontWeight: 600,
      letterSpacing: "0.08em",
    },
    button: {
      fontSize: tokens.typography.detail,
      fontWeight: 550,
      textTransform: "none",
      letterSpacing: "-0.005em",
    },
  },
  shape: { borderRadius: Number.parseFloat(tokens.radius.control) },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: "100vh",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        },
        "code, kbd, samp, pre": {
          fontFamily: MONO_FONT,
          fontVariantNumeric: "tabular-nums",
        },
        "a:focus-visible, button:focus-visible, summary:focus-visible": {
          outline: "2px solid var(--mui-palette-primary-main)",
          outlineOffset: 3,
          borderRadius: tokens.radius.control,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            scrollBehavior: "auto !important",
            animationDuration: "0.01ms !important",
            transitionDuration: "0.01ms !important",
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 34, paddingInline: 14 },
        sizeSmall: { minHeight: 30, paddingInline: 10 },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": {
            outline: "2px solid var(--mui-palette-primary-main)",
            outlineOffset: 3,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid var(--mui-palette-divider)",
          borderRadius: tokens.radius.panel,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { fontSize: tokens.typography.body } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: tokens.typography.detail,
          fontWeight: 550,
          minHeight: 44,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.control,
          fontSize: tokens.typography.caption,
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: {
          backgroundColor: "var(--mui-palette-background-default)",
          color: "var(--mui-palette-text-primary)",
          border: 0,
          borderBottom: "1px solid var(--mui-palette-divider)",
          borderRadius: 0,
          backgroundImage: "none",
        },
      },
    },
  },
});

export default theme;
