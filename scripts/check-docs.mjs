import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const errors = [];
const repositorySourceDirectories = new Set([
  ".agents",
  ".github",
  ".storybook",
  "deploy",
  "docs",
  "migrations",
  "public",
  "scripts",
  "skills",
  "src",
]);
const repositorySourceFiles = new Set([
  ".env.example",
  ".mcp.json",
  "AGENTS.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "Dockerfile",
  "LICENSE",
  "README.md",
  "docker-compose.yaml",
  "eslint.config.mjs",
  "next.config.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "postcss.config.mjs",
  "source.config.ts",
  "tsconfig.json",
  "vitest.config.ts",
]);
function repositorySource(resource) {
  if (typeof resource !== "string") return null;
  const filename = resource.replace(/^\.\//, "").split("#")[0];
  return repositorySourceFiles.has(filename) ||
    repositorySourceDirectories.has(filename.split("/")[0])
    ? filename
    : null;
}
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      ),
    )
  ).flat();
}
async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
function run(script, args, { failOnIndexDrift = false } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  const indexDrift =
    failOnIndexDrift &&
    /listing for .+ differs from that concept's description/.test(
      result.stderr,
    );
  if (result.status !== 0 || indexDrift)
    errors.push(`${script}\n${result.stdout}${result.stderr}`);
  else console.log(result.stdout.trim());
}

run(".agents/skills/okf/okf-validate.mjs", ["docs", "--strict", "--drift"], {
  failOnIndexDrift: true,
});
run(".agents/skills/odsf/odsf-validate.mjs", [
  "docs/design-system",
  "--strict",
]);
run("scripts/design-tokens.mjs", ["--check"]);

const files = (await walk(path.join(root, "docs"))).filter((file) =>
  file.endsWith(".md"),
);
files.push(path.join(root, "AGENTS.md"));
for (const file of files) {
  const raw = await fs.readFile(file, "utf8");
  const relative = path.relative(root, file);
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatter) {
    const metadata = parse(frontmatter[1]);
    for (const source of metadata.sources ?? []) {
      const filename = repositorySource(source.resource);
      if (filename && !(await exists(path.join(root, filename))))
        errors.push(`${relative}: missing source ${source.resource}`);
    }
  }
  const body = raw
    .replace(/^---\n[\s\S]*?\n---/, "")
    .replace(/```[\s\S]*?```/g, "");
  for (const match of body.matchAll(
    /\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
  )) {
    const href = match[1];
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    const target = href.split("#")[0];
    if (
      target &&
      !(await exists(
        path.resolve(path.dirname(file), decodeURIComponent(target)),
      ))
    )
      errors.push(`${relative}: broken file link ${href}`);
  }
}
const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");
if (
  (await fs.readFile(path.join(root, "CLAUDE.md"), "utf8")).trim() !==
  "@AGENTS.md"
)
  errors.push("CLAUDE.md must import AGENTS.md without duplicating it.");
const sources = JSON.parse(
  await fs.readFile(path.join(root, ".agents/skills/sources.json"), "utf8"),
);
for (const skill of sources.skills) {
  const entry = `.agents/skills/${skill.name}/SKILL.md`;
  if (!agents.includes(entry)) errors.push(`AGENTS.md must link ${entry}`);
  for (const [file, expected] of Object.entries(skill.files)) {
    const filename = path.join(root, ".agents/skills", skill.name, file);
    if (!(await exists(filename))) {
      errors.push(`Missing vendored skill file: ${filename}`);
      continue;
    }
    const actual = createHash("sha256")
      .update(await fs.readFile(filename))
      .digest("hex");
    if (actual !== expected)
      errors.push(
        `${skill.name}/${file}: differs from pinned skill revision. Review the upstream update and update its manifest.`,
      );
  }
}
const tokenExample = await fs.readFile(
  path.join(root, "docs/design-system/patterns/review-workspace.example.html"),
  "utf8",
);
const wireframe = await fs.readFile(
  path.join(
    root,
    "docs/design-system/patterns/review-workspace.wireframe.html",
  ),
  "utf8",
);
const bodyOf = (text) => text.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1];
if (!bodyOf(tokenExample) || bodyOf(tokenExample) !== bodyOf(wireframe))
  errors.push("The review wireframe must use the example's exact body.");
if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exitCode = 1;
} else
  console.log(
    `Knowledge links, design projections, and ${sources.skills.length} pinned skills are consistent.`,
  );
