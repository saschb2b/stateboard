import { it } from "node:test";
import assert from "node:assert/strict";
import { screenEditorContext } from "./screen-editor-context.ts";
import type { ProductContext } from "./release-types.ts";

const product = {
  board: { id: "board" },
  capabilities: [
    { id: "feature", archivedAt: null },
    { id: "archived", archivedAt: 1 },
  ],
  screens: [
    { id: "screen", regions: [{ id: "region" }] },
    { id: "other-screen", regions: [{ id: "other-region" }] },
  ],
  releases: [
    { id: "review", boardId: "board", candidateLabel: "Candidate 1" },
    { id: "foreign", boardId: "other-board", candidateLabel: "Private" },
  ],
} as Pick<ProductContext, "board" | "screens" | "capabilities" | "releases">;

it("returns to the board's release with the selected feature and screen region", () => {
  assert.deepEqual(
    screenEditorContext(product, {
      release: "review",
      capability: "feature",
      screen: "screen",
      region: "region",
    }),
    {
      screenId: "screen",
      regionId: "region",
      capabilityId: "feature",
      review: {
        label: "Candidate 1",
        href: "/boards/board/releases/review?view=visual&capability=feature",
      },
    },
  );
});
it("ignores foreign release, archived feature, and region from another screen", () => {
  assert.deepEqual(
    screenEditorContext(product, {
      release: "foreign",
      capability: "archived",
      screen: "screen",
      region: "other-region",
    }),
    {
      screenId: "screen",
      regionId: undefined,
      capabilityId: undefined,
      review: undefined,
    },
  );
});
it("ignores unrecognized and repeated query parameters", () => {
  assert.deepEqual(
    screenEditorContext(product, {
      release: ["review", "foreign"],
      capability: "missing",
      screen: "foreign-screen",
      region: "region",
    }),
    {
      screenId: undefined,
      regionId: undefined,
      capabilityId: undefined,
      review: undefined,
    },
  );
});
