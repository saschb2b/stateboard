import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const locales = ["en", "de"];
const defaultDirectory = fileURLToPath(
  new URL("../src/i18n/messages/", import.meta.url),
);

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function placeholders(elements, result = new Map()) {
  for (const element of elements) {
    if (element.type === TYPE.literal || element.type === TYPE.pound) continue;
    const type =
      element.type === TYPE.plural
        ? `plural:${element.pluralType}`
        : TYPE[element.type];
    const types = result.get(element.value) ?? new Set();
    types.add(type);
    result.set(element.value, types);
    if (element.type === TYPE.tag) placeholders(element.children, result);
    if (element.type === TYPE.select || element.type === TYPE.plural) {
      for (const option of Object.values(element.options))
        placeholders(option.value, result);
    }
  }
  return new Map(
    [...result].map(([name, types]) => [name, [...types].sort().join(", ")]),
  );
}

/** Validate locale catalogs without reading files or changing the input. */
export function validateCatalogs(catalogs) {
  const errors = [];
  const messages = new Map();
  const report = (locale, key, code, message) =>
    errors.push({ locale, key, code, message });

  function visit(value, locale, segments, entries) {
    const key = segments.join(".");
    if (typeof value === "string") {
      if (!value.trim()) {
        report(locale, key, "empty-message", "Message must not be empty.");
        entries.set(key, null);
        return;
      }
      try {
        const ast = parse(value, {
          requiresOtherClause: true,
          ignoreTag: false,
          shouldParseSkeletons: true,
        });
        entries.set(key, placeholders(ast));
      } catch (error) {
        report(
          locale,
          key,
          "invalid-icu",
          `Invalid ICU message: ${error instanceof Error ? error.message : String(error)}.`,
        );
        entries.set(key, null);
      }
      return;
    }
    if (!isRecord(value)) {
      report(
        locale,
        key,
        "invalid-value",
        "Expected a message string or an object of nested messages.",
      );
      return;
    }
    if (!Object.keys(value).length)
      report(locale, key, "empty-catalog", "Message groups must not be empty.");
    for (const [name, child] of Object.entries(value)) {
      const childKey = [...segments, name].join(".");
      if (!name.trim() || name.includes(".")) {
        report(
          locale,
          childKey,
          "invalid-key",
          "Message keys must be nonempty and must not contain dots. Use nested objects.",
        );
        continue;
      }
      visit(child, locale, [...segments, name], entries);
    }
  }

  for (const locale of locales) {
    const entries = new Map();
    messages.set(locale, entries);
    if (!isRecord(catalogs?.[locale])) {
      report(locale, "", "missing-locale", "Locale catalog must be an object.");
      continue;
    }
    visit(catalogs[locale], locale, [], entries);
  }

  const english = messages.get("en");
  const german = messages.get("de");
  for (const [key, source] of english) {
    if (!german.has(key)) {
      report(
        "de",
        key,
        "missing-key",
        "Missing message from the English catalog.",
      );
      continue;
    }
    const translated = german.get(key);
    if (!source || !translated) continue;
    for (const [name, type] of source) {
      if (!translated.has(name)) {
        report(
          "de",
          key,
          "missing-placeholder",
          `Missing placeholder "${name}" (${type}).`,
        );
      } else if (translated.get(name) !== type) {
        report(
          "de",
          key,
          "placeholder-type",
          `Placeholder "${name}" must use ${type}; found ${translated.get(name)}.`,
        );
      }
    }
    for (const [name, type] of translated) {
      if (!source.has(name))
        report(
          "de",
          key,
          "extra-placeholder",
          `Unexpected placeholder "${name}" (${type}).`,
        );
    }
  }
  for (const key of german.keys()) {
    if (!english.has(key))
      report("de", key, "extra-key", "Message has no matching English key.");
  }
  return {
    errors,
    messageCount: english.size,
  };
}

/** File basenames are catalog namespaces, so missing or extra files also fail. */
export async function checkCatalogDirectory(directory = defaultDirectory) {
  const catalogs = {};
  const errors = [];
  for (const locale of locales) {
    catalogs[locale] = Object.create(null);
    const localeDirectory = path.join(directory, locale);
    let files;
    try {
      files = await fs.readdir(localeDirectory, { withFileTypes: true });
    } catch (error) {
      errors.push({
        locale,
        key: "",
        code: "read-error",
        message: `Cannot read catalog directory: ${error.message}`,
      });
      continue;
    }
    for (const file of files
      .filter((file) => file.isFile() && file.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const namespace = file.name.slice(0, -5);
      try {
        catalogs[locale][namespace] = JSON.parse(
          await fs.readFile(path.join(localeDirectory, file.name), "utf8"),
        );
      } catch (error) {
        errors.push({
          locale,
          key: file.name,
          code: "read-error",
          message: `Cannot read JSON catalog: ${error.message}`,
        });
      }
    }
  }
  const result = validateCatalogs(catalogs);
  return { ...result, errors: [...errors, ...result.errors] };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const result = await checkCatalogDirectory(
      process.argv[2] ?? defaultDirectory,
    );
    if (result.errors.length) {
      for (const error of result.errors)
        console.error(
          `${error.locale}:${error.key || "<catalog>"}: ${error.message}`,
        );
      process.exitCode = 1;
    } else {
      console.log(
        `English and German catalogs match: ${result.messageCount} messages with valid ICU and matching placeholders.`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
