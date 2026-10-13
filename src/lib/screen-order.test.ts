import { it } from "node:test";
import assert from "node:assert/strict";
import { applySavedOrder } from "./screen-order.ts";

it("restores the saved order while keeping edited screens and new uploads", () => {
  const current = [
    { id: "b", label: "New label" },
    { id: "a", label: "A" },
    { id: "new", label: "Upload" },
  ];
  const restored = applySavedOrder(current, ["a", "deleted", "b"]);
  assert.deepEqual(
    restored.map((screen) => screen.id),
    ["a", "b", "new"],
  );
  assert.equal(restored[1], current[0]);
  assert.deepEqual(
    current.map((screen) => screen.id),
    ["b", "a", "new"],
  );
});
