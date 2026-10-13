#!/usr/bin/env node
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// App modules use extensionless TypeScript imports; this local CLI adds their
// extension for Node's type-stripping runtime without a transpiler dependency.
const root = fileURLToPath(new URL("../", import.meta.url));
const source = pathToFileURL(path.join(root, "src") + path.sep).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".") || !context.parentURL?.startsWith(source))
        throw error;
      const url = new URL(specifier + ".ts", context.parentURL);
      if (!existsSync(fileURLToPath(url))) throw error;
      return nextResolve(url.href, context);
    }
  },
});
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
const { getRetainedReleaseAssetFilenames, getPool } =
  await import("../src/lib/db.ts");
const { cleanupUnreferencedReleaseAssets } =
  await import("../src/lib/release-assets.ts");
try {
  const references = await getRetainedReleaseAssetFilenames();
  const remove = process.argv.includes("--delete");
  const candidates = await cleanupUnreferencedReleaseAssets(
    references,
    Date.now() - 86400000,
    remove,
  );
  console.log(
    `${remove ? "Removed" : "Would remove"} ${candidates.length} unreferenced release images older than 24 hours.`,
  );
  if (!remove)
    console.log("Dry run. Add --delete to remove these orphaned images.");
} finally {
  await getPool().end();
}
