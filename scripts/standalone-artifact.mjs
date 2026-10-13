import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isWithin,
  privateDirectories,
  privateFiles,
} from "./standalone-policy.mjs";

// Next copies these loaded environment files after applying trace exclusions.
// Remove only generated copies; deployment supplies secrets at runtime.
export async function removeBuildEnvFiles(root) {
  for (const filename of [".env", ".env.production"]) {
    await fs.rm(path.join(root, ".next/standalone", filename), { force: true });
  }
}

async function filesWithin(directory, skip = new Set()) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesWithin(filename)));
    else files.push(filename);
  }
  return files;
}

export async function checkStandaloneArtifact(
  root,
  configuredDataDir = process.env.STATEBOARD_DATA_DIR,
) {
  const build = path.join(root, ".next");
  const standalone = path.join(build, "standalone");
  const directories = privateDirectories.map((directory) =>
    path.join(root, directory),
  );
  if (configuredDataDir)
    directories.push(path.resolve(root, configuredDataDir));
  // This captures a data directory loaded by Next from .env without reading secrets.
  const metadata = JSON.parse(
    await fs.readFile(path.join(build, "required-server-files.json"), "utf8"),
  );
  for (const pattern of metadata.config?.outputFileTracingExcludes?.["/*"] ??
    []) {
    if (pattern.startsWith("./") && pattern.endsWith("/**/*")) {
      directories.push(path.resolve(root, pattern.slice(0, -5)));
    }
  }
  const isPrivate = (filename) => {
    if (directories.some((directory) => isWithin(directory, filename)))
      return true;
    const relative = path.relative(root, filename);
    return (
      privateFiles.includes(relative) ||
      (path.dirname(relative) === "." &&
        path.basename(relative).startsWith(".env"))
    );
  };
  const traces = (
    await filesWithin(
      build,
      new Set(["standalone", "dev", "cache", "node_modules"]),
    )
  ).filter((filename) => filename.endsWith(".nft.json"));
  if (traces.length === 0)
    throw new Error("No production file traces found. Run pnpm build first.");
  const errors = [];
  const checkedTargets = new Map();
  const hasPrivateTarget = async (filename) => {
    if (isPrivate(filename)) return true;
    if (!checkedTargets.has(filename)) {
      let target;
      try {
        target = await fs.realpath(filename);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      checkedTargets.set(filename, target ? isPrivate(target) : false);
    }
    return checkedTargets.get(filename);
  };
  for (const trace of traces) {
    const entries = JSON.parse(await fs.readFile(trace, "utf8")).files;
    for (const entry of entries) {
      if (await hasPrivateTarget(path.resolve(path.dirname(trace), entry))) {
        errors.push(`Private input in ${path.relative(build, trace)}`);
        break;
      }
    }
  }
  for (const filename of await filesWithin(
    standalone,
    new Set(["node_modules"]),
  )) {
    const relative = path.relative(standalone, filename);
    if (
      isPrivate(path.resolve(root, relative)) ||
      (await hasPrivateTarget(filename))
    )
      errors.push(`Private file in standalone: ${relative}`);
  }
  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
  return { traces: traces.length };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  try {
    if (process.argv[2] === "--remove-env") await removeBuildEnvFiles(root);
    else {
      const result = await checkStandaloneArtifact(root);
      console.log(
        `Standalone artifact verified: ${result.traces} traces; no private inputs.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
