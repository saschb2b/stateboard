import type { Preview } from "@storybook/nextjs-vite";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "../src/lib/theme";
import { geist, geistMono } from "../src/lib/fonts";

/**
 * Put the font variables on <html>, exactly where the root layout puts
 * them. Without this the theme's `var(--font-geist)` resolves to nothing,
 * which invalidates the whole font-family declaration and drops every
 * story to the browser's default serif. Setting them on the documentElement
 * rather than a wrapper also covers portalled UI (tooltips, menus, dialogs),
 * which renders outside the story canvas.
 */
if (typeof document !== "undefined") {
  document.documentElement.classList.add(geist.variable, geistMono.variable);
}

/**
 * Mirrors the app's real provider tree (ClientShell) minus the SSR-only
 * pieces: EmotionRegistry (server-insertion plumbing) and
 * InitColorSchemeScript (pre-hydration flash guard) do nothing useful in
 * a client-only Storybook canvas. Dark-first, like the product.
 */
const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    // The app is App Router throughout; mock next/navigation, not next/router.
    nextjs: { appDirectory: true },
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
