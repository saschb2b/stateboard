"use client";

import { createTheme } from "@mui/material/styles";

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
  typography: {
    fontFamily:
      'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { minHeight: "100vh" } },
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
