import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  checkStandaloneArtifact,
  removeBuildEnvFiles,
} from "./standalone-artifact.mjs";
import { standaloneTraceExcludes } from "./standalone-policy.mjs";

async function fixture(t, { entries = [], excludes = [] } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stateboard-artifact-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, ".next/standalone"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".next/route.js.nft.json"),
    JSON.stringify({
      files: entries.map((entry) =>
        path.relative(path.join(root, ".next"), path.resolve(root, entry)),
      ),
    }),
  );
  await fs.writeFile(
    path.join(root, ".next/required-server-files.json"),
    JSON.stringify({
      config: { outputFileTracingExcludes: { "/*": excludes } },
    }),
  );
  return root;
}

test("accepts runtime routes named uploads and release-assets without packaging media", async (t) => {
  const root = await fixture(t, {
    entries: [
      ".next/server/app/api/uploads/route.js",
      ".next/server/app/api/releases/[id]/release-assets/route.js",
      "node_modules/next/package.json",
    ],
  });
  assert.deepEqual(await checkStandaloneArtifact(root, undefined), {
    traces: 1,
  });
});

test("rejects private data, secrets, and agent inputs in file traces", async (t) => {
  for (const entry of [
    "data/release-assets/private.png",
    "data/uploads/old.png",
    ".env",
    ".env.production.local",
    ".agents/skills/skill.md",
    ".agents/browser/auth.json",
    "agent-browser.json",
    ".git/config",
    "docs/product/model.md",
  ]) {
    const root = await fixture(t, { entries: [entry] });
    await assert.rejects(
      checkStandaloneArtifact(root, undefined),
      /Private input in route/,
    );
  }
});

test("checks custom storage loaded by Next from build metadata", async (t) => {
  const root = await fixture(t, {
    entries: ["var/media/release-assets/private.png"],
    excludes: ["./var/media/**/*"],
  });
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private input/,
  );
  assert.ok(
    standaloneTraceExcludes(root, "var/media").includes("./var/media/**/*"),
  );
});

test("rejects configured external storage in traces", async (t) => {
  const root = await fixture(t, {
    entries: ["../external-stateboard-media/image.png"],
  });
  await assert.rejects(
    checkStandaloneArtifact(
      root,
      path.resolve(root, "../external-stateboard-media"),
    ),
    /Private input/,
  );
});

test("checks external storage from build metadata without inherited environment", async (t) => {
  const root = await fixture(t, {
    entries: ["../external-stateboard-media/image.png"],
    excludes: ["./../external-stateboard-media/**/*"],
  });
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private input/,
  );
  assert.ok(
    standaloneTraceExcludes(root, "../external-stateboard-media").includes(
      "./../external-stateboard-media/**/*",
    ),
  );
});

test("rejects symlink aliases to private source files", async (t) => {
  const root = await fixture(t, { entries: ["public-alias"] });
  await fs.writeFile(path.join(root, ".env"), "test fixture");
  await fs.symlink(path.join(root, ".env"), path.join(root, "public-alias"));
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private input/,
  );
  await fs.writeFile(
    path.join(root, ".next/route.js.nft.json"),
    JSON.stringify({ files: [] }),
  );
  await fs.symlink(
    path.join(root, ".env"),
    path.join(root, ".next/standalone/public-alias"),
  );
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private file in standalone: public-alias/,
  );
});

test("read-only check rejects copied env files; cleanup removes only generated Next copies", async (t) => {
  const root = await fixture(t);
  for (const filename of [".env", ".env.production"]) {
    await fs.writeFile(path.join(root, filename), "test fixture");
    await fs.writeFile(
      path.join(root, ".next/standalone", filename),
      "test fixture",
    );
  }
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private file in standalone: .env/,
  );
  assert.equal(
    await fs.readFile(path.join(root, ".next/standalone/.env"), "utf8"),
    "test fixture",
  );
  await removeBuildEnvFiles(root);
  await checkStandaloneArtifact(root, undefined);
  assert.equal(
    await fs.readFile(path.join(root, ".env"), "utf8"),
    "test fixture",
  );
  assert.equal(
    await fs.readFile(path.join(root, ".env.production"), "utf8"),
    "test fixture",
  );
  await fs.writeFile(
    path.join(root, ".next/standalone/.env.local"),
    "test fixture",
  );
  await removeBuildEnvFiles(root);
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private file in standalone: .env.local/,
  );
});

test("rejects private media copied outside a trace", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, ".next/standalone/data/uploads"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, ".next/standalone/data/uploads/private.png"),
    "test fixture",
  );
  await assert.rejects(
    checkStandaloneArtifact(root, undefined),
    /Private file in standalone: data/,
  );
});
