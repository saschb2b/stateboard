import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeSavedRegion } from "./region-update.ts";
import type { Region } from "./types.ts";

const region: Region = {
  id: "region",
  screenId: "screen",
  state: "missing",
  label: "Old label",
  notes: null,
  x: 0.1,
  y: 0.2,
  w: 0.3,
  h: 0.4,
  createdAt: 1,
  updatedAt: 1,
  updatedBy: null,
};

describe("saved region fields", () => {
  it("keeps a newer state and geometry when an earlier text response arrives", () => {
    const current = { ...region, state: "mock" as const, x: 0.5 };
    const saved = {
      ...region,
      label: "New label",
      updatedAt: 2,
      updatedBy: "editor",
    };
    const merged = mergeSavedRegion(current, saved, { label: "New label" });
    assert.equal(merged.label, "New label");
    assert.equal(merged.state, "mock");
    assert.equal(merged.x, 0.5);
    assert.equal(merged.updatedAt, 2);
    assert.equal(merged.updatedBy, "editor");
  });

  it("keeps newer text when a state response includes old text", () => {
    const current = { ...region, label: "New label", notes: "New note" };
    const saved = { ...region, state: "shipped" as const };
    const merged = mergeSavedRegion(current, saved, { state: "shipped" });
    assert.equal(merged.state, "shipped");
    assert.equal(merged.label, "New label");
    assert.equal(merged.notes, "New note");
  });
});
