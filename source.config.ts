import { defineConfig, defineDocs } from "fumadocs-mdx/config";

/**
 * Fumadocs MDX collection definitions.
 *
 * Adds an `outDir` so the generated `.source/` lives under our src tree,
 * keeping the project root tidy. Source files live under src/content/docs.
 */
export const docs = defineDocs({
  dir: "src/content/docs",
});

export default defineConfig();
