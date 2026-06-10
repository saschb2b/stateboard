import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "./time.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe("timeAgo", () => {
  const now = 1_750_000_000_000;

  it("reports under a minute as 'just now'", () => {
    assert.equal(timeAgo(now, now), "just now");
    assert.equal(timeAgo(now - 59 * SEC, now), "just now");
  });

  it("reports minutes, hours, days, months, years", () => {
    assert.equal(timeAgo(now - 60 * SEC, now), "1m ago");
    assert.equal(timeAgo(now - 59 * MIN, now), "59m ago");
    assert.equal(timeAgo(now - 2 * HR, now), "2h ago");
    assert.equal(timeAgo(now - 3 * DAY, now), "3d ago");
    assert.equal(timeAgo(now - 60 * DAY, now), "2mo ago");
    assert.equal(timeAgo(now - 730 * DAY, now), "2y ago");
  });

  it("never reports the future; clamps to 'just now'", () => {
    assert.equal(timeAgo(now + 5 * MIN, now), "just now");
  });
});
