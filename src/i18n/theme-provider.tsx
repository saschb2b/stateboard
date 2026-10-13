"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { deDE } from "@mui/material/locale";
import CssBaseline from "@mui/material/CssBaseline";
import { useLocale } from "next-intl";
import theme from "@/lib/theme";

const themes = { en: theme, de: createTheme(theme, deDE) };

/** Keep built-in control labels aligned with the application's language. */
export function LocaleThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  return (
    <ThemeProvider theme={themes[locale]} defaultMode="dark">
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
