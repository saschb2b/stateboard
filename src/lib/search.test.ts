import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSnippet, fuzzyScore, screenName, searchBoard } from "./search.ts";
import type { ScreenWithRegions } from "./types.ts";

describe("fuzzyScore", () => {
  it("ranks a prefix highest, shorter haystacks winning ties", () => {
    const long = fuzzyScore("Revenue dashboard", "rev");
    const short = fuzzyScore("Revenue", "rev");
    assert.ok(short > long);
    assert.ok(long > 0);
  });

  it("scores a mid-word substring below a prefix, with a word-boundary bonus", () => {
    const prefix = fuzzyScore("dashboard", "dash");
    const midWord = fuzzyScore("my dashboard", "dash"); // 'dash' begins a word
    const scattered = fuzzyScore("adash", "dash"); // substring, not word start
    assert.ok(prefix > midWord);
    assert.ok(midWord > scattered);
  });

  it("falls back to a subsequence match", () => {
    assert.ok(fuzzyScore("Revenue card", "rvc") >= 0);
  });

  it("returns -1 when no subsequence matches", () => {
    assert.equal(fuzzyScore("Revenue", "xyz"), -1);
  });

  it("is case-insensitive and treats an empty needle as a neutral 0", () => {
    assert.ok(fuzzyScore("REVENUE", "rev") > 0);
    assert.equal(fuzzyScore("anything", ""), 0);
  });
});

describe("buildSnippet", () => {
  it("returns null when the needle is not a substring", () => {
    assert.equal(buildSnippet("hello world", "xyz"), null);
  });

  it("marks the matched slice and pads around it, collapsing whitespace", () => {
    const parts = buildSnippet("the quick  brown\nfox", "brown");
    assert.ok(parts);
    const marked = parts!.filter((p) => p.match).map((p) => p.text);
    assert.deepEqual(marked, ["brown"]);
    assert.ok(!parts!.some((p) => p.text.includes("\n")));
  });

  it("elides with … when the match is far from the ends", () => {
    const long = "x".repeat(80) + "needle" + "y".repeat(80);
    const parts = buildSnippet(long, "needle");
    assert.ok(parts);
    assert.equal(parts![0]?.text, "…");
    assert.equal(parts![parts!.length - 1]?.text, "…");
  });
});

describe("screenName", () => {
  it("uses the label, falling back to a 1-based Screen N", () => {
    assert.equal(screenName({ label: "Alpha" }, 2), "Alpha");
    assert.equal(screenName({ label: null }, 0), "Screen 1");
  });
});

// Minimal screen/region fixtures — only the fields searchBoard reads.
function screen(
  id: string,
  label: string | null,
  regions: {
    id: string;
    label: string | null;
    notes: string | null;
    state?: "shipped" | "mock" | "missing";
  }[],
): ScreenWithRegions {
  return {
    id,
    boardId: "b",
    filename: "f.png",
    mimeType: "image/png",
    width: 100,
    height: 100,
    label,
    position: 0,
    createdAt: 0,
    mediaUrl: "",
    regions: regions.map((r) => ({
      id: r.id,
      screenId: id,
      x: 0,
      y: 0,
      w: 0.1,
      h: 0.1,
      state: r.state ?? "shipped",
      label: r.label,
      notes: r.notes,
      createdAt: 0,
      updatedAt: 0,
      updatedBy: null,
    })),
  };
}

describe("searchBoard", () => {
  const screens: ScreenWithRegions[] = [
    screen("s1", "Dashboard", [
      { id: "r1", label: "Revenue card", notes: "shows MRR by month" },
      { id: "r2", label: null, notes: "the churn cohort chart" },
    ]),
    screen("s2", "Settings", [{ id: "r3", label: "Danger zone", notes: null }]),
  ];

  it("returns nothing for an empty query", () => {
    assert.deepEqual(searchBoard(screens, "  "), { screens: [], regions: [] });
  });

  it("matches a screen by name", () => {
    const { screens: hits } = searchBoard(screens, "dash");
    assert.equal(hits[0]?.screenId, "s1");
    assert.equal(hits[0]?.name, "Dashboard");
  });

  it("matches a region by its label", () => {
    const { regions } = searchBoard(screens, "revenue");
    assert.equal(regions[0]?.regionId, "r1");
    assert.equal(regions[0]?.snippet, null); // label hit → no snippet
  });

  it("matches a region by its notes and returns a highlighted snippet", () => {
    const { regions } = searchBoard(screens, "churn");
    const hit = regions.find((r) => r.regionId === "r2");
    assert.ok(hit);
    assert.ok(hit!.snippet);
    assert.ok(hit!.snippet!.some((p) => p.match && p.text === "churn"));
  });

  it("ranks label hits above notes-only hits", () => {
    // "card" is in r1's label and nowhere in a notes-only hit here.
    const { regions } = searchBoard(screens, "card");
    assert.equal(regions[0]?.regionId, "r1");
  });

  it("carries the owning screen so the palette can jump to it", () => {
    const { regions } = searchBoard(screens, "danger");
    assert.equal(regions[0]?.screenId, "s2");
    assert.equal(regions[0]?.screenName, "Settings");
  });
});
