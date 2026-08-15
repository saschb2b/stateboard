import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  // Scoped to src/components on purpose: a bare src/** glob would sweep the
  // Fumadocs MDX under src/content/docs into the sidebar, where its
  // components (<Callout> etc.) don't exist and every page errors.
  stories: ["../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/nextjs-vite",
  // Serve /public so stories can use the same assets the app does —
  // notably the demo-board SVGs under /demo/*.svg and /icon.svg.
  staticDirs: ["../public"],
};
export default config;
