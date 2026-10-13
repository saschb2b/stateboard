import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isReleaseLocation,
  readReleaseLocation,
  releaseLocationUrl,
} from "./release-location.ts";

const base = "https://stateboard.example/boards/one/releases/two";

describe("release review location", () => {
  it("drills into a check without erasing the previous view's category or context", () => {
    const previous = `${base}?view=backend&category=data&capability=cap-one&other=kept#checks`;
    const next = releaseLocationUrl(previous, {
      view: "qa",
      check: "check-one",
    });
    assert.equal(
      next,
      "/boards/one/releases/two?view=qa&category=data&capability=cap-one&other=kept&check=check-one#checks",
    );
    assert.equal(new URL(previous).searchParams.get("view"), "backend");
    assert.equal(
      readReleaseLocation(new URL(next, base).search).category,
      "data",
    );
  });

  it("retains the active view and category for a second check in the same view", () => {
    const next = releaseLocationUrl(
      `${base}?view=qa&category=security&check=first`,
      { check: "second" },
    );
    assert.equal(
      next,
      "/boards/one/releases/two?view=qa&category=security&check=second",
    );
  });

  it("writes a complete role change without an intermediate cleared location", () => {
    assert.equal(
      releaseLocationUrl(
        `${base}?view=qa&category=security&check=first&capability=cap-one`,
        {
          view: "backend",
          check: null,
          category: null,
          capability: null,
          component: null,
        },
      ),
      "/boards/one/releases/two?view=backend",
    );
  });

  it("reads architecture focus from a direct link and rejects malformed values", () => {
    assert.deepEqual(
      readReleaseLocation("?view=backend&capability=cap-one&component=cmp_one"),
      {
        view: "backend",
        check: null,
        category: null,
        capability: "cap-one",
        component: "cmp_one",
      },
    );
    assert.deepEqual(
      readReleaseLocation(
        "?view=unknown&category=other&check=../bad&capability=hello%20there&component=" +
          "a".repeat(129),
      ),
      {
        view: "release",
        check: null,
        category: null,
        capability: null,
        component: null,
      },
    );
  });

  it("does not attach review navigation to product, settings, or unrelated pages", () => {
    assert.equal(isReleaseLocation("/boards/one/releases/two"), true);
    assert.equal(isReleaseLocation("/share/demo/releases"), true);
    for (const path of [
      "/boards/one/releases",
      "/boards",
      "/settings",
      "/other/releases/example",
      "/iframe.html",
    ]) {
      assert.equal(isReleaseLocation(path), false);
    }
  });

  it("supports only the explicitly configured deployment base path", () => {
    assert.equal(
      isReleaseLocation("/stateboard/share/demo/releases", "/stateboard"),
      true,
    );
    assert.equal(
      isReleaseLocation("/stateboard/boards/one/releases/two", "/stateboard"),
      true,
    );
    assert.equal(
      isReleaseLocation(
        "/team/stateboard/share/demo/releases",
        "/team/stateboard",
      ),
      true,
    );
    for (const path of [
      "/share/demo/releases",
      "/other/share/demo/releases",
      "/stateboard-other/share/demo/releases",
      "/stateboard/boards/one/releases",
      "/stateboard/other/releases/two",
    ]) {
      assert.equal(isReleaseLocation(path, "/stateboard"), false);
    }
    assert.equal(isReleaseLocation("/stateboard/share/demo/releases"), false);
    assert.equal(
      releaseLocationUrl(
        "https://example.test/stateboard/share/demo/releases?view=backend",
        { view: "qa", check: "first" },
      ),
      "/stateboard/share/demo/releases?view=qa&check=first",
    );
  });
});
