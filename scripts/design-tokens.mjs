import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { format } from "prettier";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = "docs/design-system/foundations/tokens.md";
const text = await fs.readFile(path.join(root, source), "utf8");
const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
if (!frontmatter) throw new Error(`${source} has no frontmatter`);
const { tokens } = parse(frontmatter[1]);
const flat = new Map();
function flatten(value, segments = []) {
  if (typeof value === "string") {
    const name = segments.join("-");
    if (flat.has(name)) throw new Error(`Token collision: ${name}`);
    flat.set(name, value);
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value))
      flatten(child, [...segments, key]);
  } else throw new Error(`Invalid token: ${segments.join(".")}`);
}
flatten(tokens);
const outputs = {
  "src/lib/design-tokens.ts": await format(
    `// Generated from ${source}. Run pnpm design:generate.\nexport const designTokens = ${JSON.stringify(tokens)} as const;\n`,
    { parser: "typescript" },
  ),
  "docs/design-system/styles/tokens.css": await format(
    `/* Generated from foundations/tokens.md. Run pnpm design:generate. */\n:root {\n${[...flat].map(([name, value]) => `  --${name}: ${value};`).join("\n")}\n}\n`,
    { parser: "css" },
  ),
};
for (const [file, content] of Object.entries(outputs)) {
  if (process.argv.includes("--check")) {
    if ((await fs.readFile(path.join(root, file), "utf8")) !== content)
      throw new Error(`${file} is stale. Run pnpm design:generate.`);
  } else await fs.writeFile(path.join(root, file), content);
}
console.log(
  process.argv.includes("--check")
    ? "Design tokens match their source."
    : "Generated application and example tokens.",
);
