"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { EmotionRegistry } from "./emotion-registry";
import theme from "@/lib/theme";

/**
 * App-wide client wrapper: emotion registry + MUI theme + baseline.
 * Defaults to dark mode because the pitch deck is dark-first.
 */
export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <ThemeProvider theme={theme} defaultMode="dark">
        <InitColorSchemeScript attribute="class" defaultMode="dark" />
        <CssBaseline />
        {children}
      </ThemeProvider>
    </EmotionRegistry>
  );
}
