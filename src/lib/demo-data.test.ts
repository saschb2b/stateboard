import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDemoBoard } from "./demo-data.ts";
import { REGION_STATES, validateRegionBox } from "./types.ts";

// src/lib/demo-data.test.ts → repo root is two levels up from src/lib.
const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");

const { board, screens } = getDemoBoard();
const allRegions = screens.flatMap((s) => s.regions);

/**
 * The demo board is served from memory (getDemoBoard) and never passes through
 * the API write path, so it dodges validateRegionBox and the DB CHECKs that
 * guard real boards. It's also the app's canonical public example — linked
 * from empty states, docs, and marketing. These tests are the only thing
 * stopping a future edit to demo-data.ts from shipping an off-screen region,
 * a dropped state, or a broken image reference to every demo visitor.
 */
describe("demo board shape", () => {
  it("has multiple screens, each with regions", () => {
    assert.ok(screens.length >= 2, "expected at least two demo screens");
    for (const s of screens) {
      assert.ok(s.regions.length > 0, `screen ${s.id} has no regions`);
      assert.ok(
        s.width > 0 && s.height > 0,
        `screen ${s.id} has no dimensions`,
      );
    }
  });

  it("uses stable, unique ids for screens and regions", () => {
    const screenIds = screens.map((s) => s.id);
    assert.equal(
      new Set(screenIds).size,
      screenIds.length,
      "screen ids collide",
    );
    const regionIds = allRegions.map((r) => r.id);
    assert.equal(
      new Set(regionIds).size,
      regionIds.length,
      "region ids collide",
    );
  });
});

describe("demo board region invariants", () => {
  it("every region satisfies the normalized-coordinate box invariant", () => {
    for (const r of allRegions) {
      const result = validateRegionBox(r);
      assert.equal(
        result.ok,
        true,
        `region "${r.label}" (${r.id}) violates the box invariant: ${
          result.ok ? "" : result.error
        }`,
      );
    }
  });

  it("uses only the three canonical states, and demonstrates all of them", () => {
    const used = new Set(allRegions.map((r) => r.state));
    for (const r of allRegions) {
      assert.ok(
        REGION_STATES.includes(r.state),
        `region "${r.label}" has unknown state ${r.state}`,
      );
    }
    // The example exists to teach the three-state model; it should show each.
    for (const state of REGION_STATES) {
      assert.ok(
        used.has(state),
        `demo never demonstrates the "${state}" state`,
      );
    }
  });

  it("gives every region a non-empty label", () => {
    for (const r of allRegions) {
      assert.ok(
        typeof r.label === "string" && r.label.trim().length > 0,
        `region ${r.id} has an empty label`,
      );
    }
  });
});

describe("demo board assets", () => {
  it("each screen points at an SVG that exists under public/demo", () => {
    for (const s of screens) {
      const file = path.join(repoRoot, "public", "demo", s.filename);
      assert.ok(
        existsSync(file),
        `missing demo asset: public/demo/${s.filename}`,
      );
    }
  });

  it("describes the board for the share-page title/metadata", () => {
    assert.ok(board.name.trim().length > 0);
    assert.ok((board.description ?? "").trim().length > 0);
  });
});
