import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_REGION_SIZE,
  clamp,
  moveBox,
  resizeBox,
  nudgeBox,
  type Box,
} from "./region-geometry.ts";

const EPS = 1e-9;
const close = (a: number, b: number) => Math.abs(a - b) < EPS;

function assertBox(actual: Box, expected: Box) {
  assert.ok(
    close(actual.x, expected.x) &&
      close(actual.y, expected.y) &&
      close(actual.w, expected.w) &&
      close(actual.h, expected.h),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

/** Every operation must leave the box inside [0,1] and no smaller than the min. */
function assertInvariants(b: Box) {
  assert.ok(b.x >= -EPS, `x >= 0, got ${b.x}`);
  assert.ok(b.y >= -EPS, `y >= 0, got ${b.y}`);
  assert.ok(b.x + b.w <= 1 + EPS, `x + w <= 1, got ${b.x + b.w}`);
  assert.ok(b.y + b.h <= 1 + EPS, `y + h <= 1, got ${b.y + b.h}`);
  assert.ok(b.w >= MIN_REGION_SIZE - EPS, `w >= min, got ${b.w}`);
  assert.ok(b.h >= MIN_REGION_SIZE - EPS, `h >= min, got ${b.h}`);
}

describe("clamp", () => {
  it("bounds a value to [lo, hi]", () => {
    assert.equal(clamp(0.5, 0, 1), 0.5);
    assert.equal(clamp(-0.3, 0, 1), 0);
    assert.equal(clamp(1.4, 0, 1), 1);
  });
});

describe("moveBox", () => {
  const box: Box = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };

  it("slides by the delta and preserves size", () => {
    assertBox(moveBox(box, 0.1, -0.1), { x: 0.5, y: 0.3, w: 0.2, h: 0.2 });
  });

  it("clamps at the top-left edge", () => {
    assertBox(moveBox(box, -1, -1), { x: 0, y: 0, w: 0.2, h: 0.2 });
  });

  it("clamps at the bottom-right edge (1 - size)", () => {
    assertBox(moveBox(box, 1, 1), { x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
  });

  it("stays in bounds for a sweep of deltas", () => {
    for (let d = -1.5; d <= 1.5; d += 0.1)
      assertInvariants(moveBox(box, d, -d));
  });
});

describe("resizeBox", () => {
  const box: Box = { x: 0.3, y: 0.3, w: 0.4, h: 0.4 };

  it("grows from the SE corner, pinning the top-left", () => {
    assertBox(resizeBox(box, "se", 0.1, 0.1), {
      x: 0.3,
      y: 0.3,
      w: 0.5,
      h: 0.5,
    });
  });

  it("grows from the NW corner, pinning the bottom-right", () => {
    const r = resizeBox(box, "nw", -0.1, -0.1);
    assertBox(r, { x: 0.2, y: 0.2, w: 0.5, h: 0.5 });
    // bottom-right edge stays put
    assert.ok(close(r.x + r.w, box.x + box.w));
    assert.ok(close(r.y + r.h, box.y + box.h));
  });

  it("collapses no smaller than the minimum size", () => {
    const r = resizeBox(box, "se", -1, -1);
    assert.ok(close(r.w, MIN_REGION_SIZE));
    assert.ok(close(r.h, MIN_REGION_SIZE));
    // SE shrink keeps the top-left pinned
    assert.ok(close(r.x, box.x) && close(r.y, box.y));
  });

  it("cannot push an edge past the frame", () => {
    const r = resizeBox({ x: 0.8, y: 0.8, w: 0.1, h: 0.1 }, "se", 1, 1);
    assertBox(r, { x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
  });

  it("holds every invariant across all corners and deltas", () => {
    for (const corner of ["nw", "ne", "sw", "se"] as const) {
      for (let d = -1; d <= 1; d += 0.13) {
        assertInvariants(resizeBox(box, corner, d, -d));
      }
    }
  });
});

describe("nudgeBox", () => {
  const box: Box = { x: 0.2, y: 0.2, w: 0.1, h: 0.1 };

  it("moves one step per arrow without changing size", () => {
    assertBox(nudgeBox(box, "ArrowRight", false, 0.05), {
      x: 0.25,
      y: 0.2,
      w: 0.1,
      h: 0.1,
    });
    assertBox(nudgeBox(box, "ArrowUp", false, 0.05), {
      x: 0.2,
      y: 0.15,
      w: 0.1,
      h: 0.1,
    });
  });

  it("resizes from the bottom-right when asked, without moving x/y", () => {
    const r = nudgeBox(box, "ArrowDown", true, 0.05);
    assertBox(r, { x: 0.2, y: 0.2, w: 0.1, h: 0.15 });
  });

  it("clamps a move at the frame edge", () => {
    assertBox(
      nudgeBox({ x: 0.85, y: 0.2, w: 0.1, h: 0.1 }, "ArrowRight", false, 0.1),
      {
        x: 0.9,
        y: 0.2,
        w: 0.1,
        h: 0.1,
      },
    );
  });

  it("clamps a resize to the minimum size", () => {
    const r = nudgeBox(box, "ArrowLeft", true, 1);
    assert.ok(close(r.w, MIN_REGION_SIZE));
  });

  it("ignores keys that are not arrows", () => {
    assertBox(nudgeBox(box, "Enter", false, 0.05), box);
    assertBox(nudgeBox(box, "a", true, 0.05), box);
  });
});
