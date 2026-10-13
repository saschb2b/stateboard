"use client";

import { LocaleThemeProvider } from "@/i18n/theme-provider";
import { AppLocaleProvider } from "@/i18n/provider";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { EmotionRegistry } from "./emotion-registry";

/** Shared language, styling and hydration setup for the product interface. */
export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLocaleProvider>
      <EmotionRegistry>
        <LocaleThemeProvider>
          <InitColorSchemeScript attribute="class" defaultMode="dark" />
          {children}
        </LocaleThemeProvider>
      </EmotionRegistry>
    </AppLocaleProvider>
  );
}
