import type { StorybookConfig } from "@storybook/nextjs-vite";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

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
  // Prebundle the shared UI imports before tests start. Discovering these
  // during a story reload invalidates Storybook's browser module URLs.
  viteFinal: async (config) => {
    const directory = path.resolve(process.cwd(), "src/components");
    const files = (await readdir(directory, { recursive: true })).filter(
      (file) => /\.tsx?$/.test(file),
    );
    const sources = await Promise.all(
      files.map((file) => readFile(path.join(directory, file), "utf8")),
    );
    const imports = sources.flatMap((source) =>
      [...source.matchAll(/from\s+["'](@mui\/[^"']+)["']/g)].map(
        (match) => match[1]!,
      ),
    );
    return {
      ...config,
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...new Set([...(config.optimizeDeps?.include ?? []), ...imports]),
        ],
      },
    };
  },
};
export default config;
