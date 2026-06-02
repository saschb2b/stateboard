import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TEXT_LIMITS,
  checkTextLength,
  isFiniteIn01,
  validateRegionBox,
} from "./types.ts";

describe("isFiniteIn01", () => {
  it("accepts finite numbers within [0, 1]", () => {
    for (const n of [0, 0.25, 0.5, 1]) assert.equal(isFiniteIn01(n), true);
  });

  it("rejects out-of-range, non-finite, and non-number values", () => {
    for (const n of [-0.0001, 1.0001, NaN, Infinity, "0.5", null, undefined]) {
      assert.equal(isFiniteIn01(n), false);
    }
  });
});

describe("validateRegionBox", () => {
  it("accepts a box flush to the screen edges", () => {
    const r = validateRegionBox({ x: 0, y: 0, w: 1, h: 1 });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.box, { x: 0, y: 0, w: 1, h: 1 });
  });

  it("accepts an interior box", () => {
    assert.equal(
      validateRegionBox({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }).ok,
      true,
    );
  });

  it("rejects coordinates outside [0, 1], missing, or not finite numbers", () => {
    const bad = [
      { x: -0.1, y: 0, w: 0.2, h: 0.2 },
      { x: 0, y: 0, w: 1.2, h: 0.2 },
      { x: NaN, y: 0, w: 0.2, h: 0.2 },
      { x: "0", y: 0, w: 0.2, h: 0.2 },
      { x: 0, w: 0.2, h: 0.2 }, // y omitted entirely
    ];
    for (const box of bad) {
      const r = validateRegionBox(box);
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.error, /\[0, 1\]/);
    }
  });

  it("rejects zero-area boxes", () => {
    for (const box of [
      { x: 0.1, y: 0.1, w: 0, h: 0.2 },
      { x: 0.1, y: 0.1, w: 0.2, h: 0 },
    ]) {
      const r = validateRegionBox(box);
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.error, /non-zero size/);
    }
  });

  it("rejects a box that extends beyond the screen", () => {
    // The shape the PATCH path used to allow: a valid x and a valid w that
    // together push the region off the right edge (0.9 + 0.5 = 1.4).
    const r = validateRegionBox({ x: 0.9, y: 0, w: 0.5, h: 0.2 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /beyond screen bounds/);
  });

  it("tolerates sub-epsilon overshoot but rejects real overflow", () => {
    // 0.8 + 0.20005 = 1.00005, inside the 1.0001 tolerance for the browser's
    // pixel->relative rounding; 0.6 + 0.5 = 1.1 is well past it.
    assert.equal(
      validateRegionBox({ x: 0.8, y: 0, w: 0.20005, h: 0.2 }).ok,
      true,
    );
    assert.equal(validateRegionBox({ x: 0.6, y: 0, w: 0.5, h: 0.2 }).ok, false);
  });
});

describe("checkTextLength", () => {
  it("passes a null value (an absent or cleared field)", () => {
    assert.equal(checkTextLength(null, "notes", TEXT_LIMITS.notes), null);
  });

  it("passes a value at exactly the limit", () => {
    const atLimit = "a".repeat(TEXT_LIMITS.name);
    assert.equal(checkTextLength(atLimit, "name", TEXT_LIMITS.name), null);
  });

  it("rejects a value one character past the limit, naming the field + cap", () => {
    const tooLong = "a".repeat(TEXT_LIMITS.name + 1);
    const err = checkTextLength(tooLong, "name", TEXT_LIMITS.name);
    assert.equal(err, `name must be at most ${TEXT_LIMITS.name} characters`);
  });

  it("passes the empty string (no length to cap)", () => {
    assert.equal(checkTextLength("", "label", TEXT_LIMITS.label), null);
  });

  it("rejects megabyte-scale abuse input", () => {
    const huge = "x".repeat(5_000_000);
    assert.notEqual(checkTextLength(huge, "notes", TEXT_LIMITS.notes), null);
  });
});
