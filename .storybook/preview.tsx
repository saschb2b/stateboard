import type { Preview } from "@storybook/nextjs-vite";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "../src/lib/theme";

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
