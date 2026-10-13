import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test("knowledge checks reject documentation drift in an isolated copy", async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "stateboard-docs-"));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  const entries = [
    ".agents",
    ".github",
    ".storybook",
    "docs",
    "migrations",
    "scripts",
    "skills",
    "src",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "package.json",
    "next.config.mjs",
    ".env.example",
    ".mcp.json",
    "docker-compose.yaml",
  ];
  await Promise.all(
    entries.map((entry) =>
      fs.cp(path.join(root, entry), path.join(fixture, entry), {
        recursive: true,
      }),
    ),
  );
  await fs.symlink(
    path.join(root, "node_modules"),
    path.join(fixture, "node_modules"),
  );

  const check = () => {
    const result = spawnSync(process.execPath, ["scripts/check-docs.mjs"], {
      cwd: fixture,
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return { status: result.status, output: result.stdout + result.stderr };
  };
  const withEdit = async (relative, edit, assertion) => {
    const filename = path.join(fixture, relative);
    const original = await fs.readFile(filename, "utf8");
    try {
      const changed = edit(original);
      assert.notEqual(
        changed,
        original,
        `The fixture edit must change ${relative}`,
      );
      await fs.writeFile(filename, changed);
      assertion(check());
    } finally {
      await fs.writeFile(filename, original);
    }
  };
  const rejects = (pattern) => (result) => {
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, pattern);
  };

  await t.test("accepts narrative sources and the nested design bundle", () => {
    const result = check();
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /pinned skills are consistent/);
  });

  await t.test("rejects a broken operating-manual link", () =>
    withEdit(
      "AGENTS.md",
      (text) => text.replace("./docs/index.md", "./docs/missing.md"),
      rejects(/AGENTS\.md: broken file link \.\/docs\/missing\.md/),
    ),
  );

  await t.test("rejects a generated token change", () =>
    withEdit(
      "src/lib/design-tokens.ts",
      (text) => text + "\n// Unreconciled generated output.\n",
      rejects(/src\/lib\/design-tokens\.ts is stale/),
    ),
  );

  await t.test(
    "rejects an index description that no longer matches its concept",
    () =>
      withEdit(
        "docs/architecture/index.md",
        (text) =>
          text.replace(
            /(?<=\[Runtime architecture\]\(runtime\.md\) - ).+/,
            "An obsolete description of the runtime.",
          ),
        rejects(
          /listing for architecture\/runtime\.md differs from that concept's description/,
        ),
      ),
  );

  await t.test("rejects an unreviewed vendor change", () =>
    withEdit(
      ".agents/skills/react-compiler/SKILL.md",
      (text) => text + "\nUnreviewed local instruction.\n",
      rejects(/react-compiler\/SKILL\.md: differs from pinned skill revision/),
    ),
  );

  await t.test("rejects a missing root source file", async () => {
    const filename = path.join(fixture, "README.md");
    const original = await fs.readFile(filename);
    try {
      await fs.rm(filename);
      rejects(/missing source README\.md/)(check());
    } finally {
      await fs.writeFile(filename, original);
    }
  });

  await t.test("rejects a missing repository skill source", () =>
    withEdit(
      "docs/engineering/knowledge-maintenance.md",
      (text) =>
        text.replace(
          'resource: ".agents/skills/okf/SKILL.md"',
          'resource: ".agents/skills/okf/missing.md"',
        ),
      rejects(/missing source \.agents\/skills\/okf\/missing\.md/),
    ),
  );

  await t.test("rejects a missing packaged skill source", () =>
    withEdit(
      "docs/architecture/agent-api.md",
      (text) =>
        text.replace(
          'resource: "skills/stateboard/SKILL.md"',
          'resource: "skills/stateboard/missing.md"',
        ),
      rejects(/missing source skills\/stateboard\/missing\.md/),
    ),
  );

  await t.test("rejects changed markup in a wireframe", () =>
    withEdit(
      "docs/design-system/patterns/review-workspace.wireframe.html",
      (text) => text.replace("</body>", "<p>Unmatched content</p></body>"),
      rejects(
        /review-workspace\.wireframe\.html: wireframe must use the example's exact body/,
      ),
    ),
  );

  await t.test(
    "checks new wireframes without a hardcoded file list",
    async () => {
      const filename = path.join(
        fixture,
        "docs/design-system/patterns/unpaired.wireframe.html",
      );
      try {
        await fs.writeFile(
          filename,
          "<!doctype html><html><body>Example</body></html>",
        );
        rejects(/unpaired\.wireframe\.html: missing matching example/)(check());
      } finally {
        await fs.rm(filename);
      }
    },
  );

  await t.test("passes again after every temporary edit is restored", () => {
    const result = check();
    assert.equal(result.status, 0, result.output);
  });
});
