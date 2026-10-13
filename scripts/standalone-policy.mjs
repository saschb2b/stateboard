import path from "node:path";

// These files are development inputs or runtime state, never deployment inputs.
export const privateDirectories = [
  "data",
  ".git",
  ".agents",
  ".claude",
  ".codex",
  ".github",
  ".storybook",
  "docs",
];
export const privateFiles = [
  ".mcp.json",
  "agent-browser.json",
  "AGENTS.md",
  "CLAUDE.md",
];

export function isWithin(parent, filename) {
  const relative = path.relative(parent, filename);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function standaloneTraceExcludes(root, configuredDataDir) {
  const directories = [...privateDirectories];
  if (configuredDataDir) {
    const dataDir = path.resolve(root, configuredDataDir);
    const relative = path.relative(root, dataDir).split(path.sep).join("/");
    if (isWithin(dataDir, root) || /[*?{}()[\]!+@]/.test(relative)) {
      throw new Error(
        "Build storage must be a separate directory without glob characters.",
      );
    }
    // Keep external storage in build metadata too, so the independent checker
    // knows the setting when Next loaded it from an environment file.
    directories.push(relative);
  }
  return [...new Set(directories)]
    .map((directory) => `./${directory}/**/*`)
    .concat(
      "./.env*",
      privateFiles.map((filename) => `./${filename}`),
    );
}
