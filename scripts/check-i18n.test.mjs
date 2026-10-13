import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { validateCatalogs, checkCatalogDirectory } from "./check-i18n.mjs";

function pair(english, german) {
  return validateCatalogs({
    en: { message: english },
    de: { message: german },
  });
}

test("translations may reorder rich text and plural branches without losing parameters", () => {
  const source = {
    en: {
      actions: {
        summary:
          "<strong>{name}</strong>: {count, plural, one {# check on {date, date, short}} other {# checks on {date, date, short}}}",
        amount: "{amount, number, ::currency/EUR}",
      },
    },
    de: {
      actions: {
        amount: "{amount, number, ::currency/EUR}",
        summary:
          "{count, plural, other {# Prüfungen am {date, date, short}} one {# Prüfung am {date, date, short}}} für <strong>{name}</strong>",
      },
    },
  };
  const before = structuredClone(source);
  assert.deepEqual(validateCatalogs(source), { errors: [], messageCount: 2 });
  assert.deepEqual(source, before);
});

test("nested missing and extra keys are both reported", () => {
  const result = validateCatalogs({
    en: { form: { save: "Save", cancel: "Cancel" } },
    de: { form: { save: "Speichern", delete: "Löschen" } },
  });
  assert.deepEqual(
    result.errors.map(({ key, code }) => ({ key, code })),
    [
      { key: "form.cancel", code: "missing-key" },
      { key: "form.delete", code: "extra-key" },
    ],
  );
});

test("rejects a message replaced by a nested object", () => {
  const result = validateCatalogs({
    en: { title: "Title" },
    de: { title: { text: "Titel" } },
  });
  assert.deepEqual(
    result.errors.map(({ code }) => code),
    ["missing-key", "extra-key"],
  );
});

test("rejects empty values, invalid values, and dotted keys even when locales match", () => {
  for (const value of ["", " \n\t", null, [], 7, false, {}]) {
    assert.ok(pair(value, value).errors.length > 0, JSON.stringify(value));
  }
  const result = validateCatalogs({
    en: { "form.save": "Save", "": "Bad key" },
    de: { "form.save": "Speichern", "": "Ungültiger Schlüssel" },
  });
  assert.equal(
    result.errors.filter(({ code }) => code === "invalid-key").length,
    4,
  );
});

test("rejects missing locales and invalid catalog roots", () => {
  for (const value of [undefined, null, {}, { en: "hello", de: [] }]) {
    assert.ok(
      validateCatalogs(value).errors.some(
        ({ code }) => code === "missing-locale",
      ),
    );
  }
});

test("checks ICU grammar in both languages including required other clauses and tags", () => {
  for (const invalid of [
    "Hello {name",
    "{count, plural, one {one}}",
    "{state, select, ready {Ready}}",
    "<strong>Open</em>",
    "{count, unexpected}",
    "{count, plural, one {one} one {duplicate} other {#}}",
  ]) {
    for (const [english, german] of [
      [invalid, "Valid"],
      ["Valid", invalid],
    ]) {
      assert.ok(
        pair(english, german).errors.some(({ code }) => code === "invalid-icu"),
        invalid,
      );
    }
  }
});

test("finds renamed placeholders inside nested select and plural branches", () => {
  const result = pair(
    "{role, select, owner {{count, plural, one {{name} has one} other {{name} has #}}} other {Read only}}",
    "{role, select, owner {{count, plural, one {{person} hat eine} other {{person} hat #}}} other {Schreibgeschützt}}",
  );
  assert.deepEqual(
    result.errors.map(({ code }) => code),
    ["missing-placeholder", "extra-placeholder"],
  );
  assert.match(result.errors[0].message, /"name"/);
  assert.match(result.errors[1].message, /"person"/);
});

test("rejects changes to formatted types, plural modes, and rich-text tag callbacks", () => {
  for (const [english, german] of [
    ["{count, number}", "{count}"],
    ["{when, date}", "{when, time}"],
    [
      "{count, plural, one {#} other {#}}",
      "{count, selectordinal, one {#} other {#}}",
    ],
    ["<strong>{name}</strong>", "{strong}: {name}"],
  ]) {
    assert.ok(
      pair(english, german).errors.some(
        ({ code }) => code === "placeholder-type",
      ),
    );
  }
  assert.ok(
    pair("<strong>{name}</strong>", "<em>{name}</em>").errors.some(
      ({ code }) => code === "missing-placeholder",
    ),
  );
});

test("allows repeated values, locale-specific plural options, and quoted literal braces", () => {
  assert.deepEqual(pair("{name}, {name}", "{name}").errors, []);
  assert.deepEqual(
    pair("'{name}' is literal", "'{value}' ist Text").errors,
    [],
  );
  assert.deepEqual(
    pair(
      "{count, plural, one {# check} other {# checks}}",
      "{count, plural, =0 {Keine Prüfungen} one {# Prüfung} other {# Prüfungen}}",
    ).errors,
    [],
  );
});

test("directory check and CLI reject drift without touching repository catalogs", async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "stateboard-i18n-"));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  for (const locale of ["en", "de"]) await fs.mkdir(path.join(fixture, locale));
  const write = (locale, name, value) =>
    fs.writeFile(path.join(fixture, locale, name), JSON.stringify(value));
  await write("en", "common.json", { save: "Save {name}" });
  await write("de", "common.json", { save: "{name} speichern" });
  const script = fileURLToPath(new URL("./check-i18n.mjs", import.meta.url));
  const run = () => {
    const result = spawnSync(process.execPath, [script, fixture], {
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return result;
  };
  assert.equal(run().status, 0);
  assert.equal((await checkCatalogDirectory(fixture)).messageCount, 1);

  await write("de", "extra.json", { save: "Speichern" });
  let result = run();
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /de:extra.save: Message has no matching English key/,
  );
  await fs.rm(path.join(fixture, "de", "extra.json"));

  await fs.writeFile(path.join(fixture, "de", "common.json"), '{"save":');
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /de:common.json: Cannot read JSON catalog/);

  await fs.rm(path.join(fixture, "de"), { recursive: true });
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /de:<catalog>: Cannot read catalog directory/);
});
