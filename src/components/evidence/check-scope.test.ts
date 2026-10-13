import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CheckEvaluation, ReleaseCheck } from "../../lib/release-types";
import { evaluateRelease } from "../../lib/readiness.ts";
import { releaseFixture, TEST_NOW } from "../../lib/release-test-data.ts";
import { filterChecks } from "./check-scope.ts";
import { checkFocusUrl } from "../release/use-check-focus.ts";

const base = releaseFixture().checks[0]!;
const check = (
  id: string,
  patch: Partial<ReleaseCheck> = {},
): ReleaseCheck => ({ ...base, id, ...patch });
const result = (
  checkId: string,
  state: CheckEvaluation["state"],
): CheckEvaluation => ({
  checkId,
  state,
  required: true,
  evidenceId: null,
  reason: state,
  expiresAt: null,
});

describe("check presentation filters", () => {
  it("keeps only declared subjects and explicit release checks in a scope", () => {
    const checks = [
      check("cap"),
      check("other", { subjectId: "cap2" }),
      check("component", { subjectType: "component", subjectId: "api" }),
      check("unlinked", { subjectType: "component", subjectId: null }),
      check("release", { subjectType: "release", subjectId: null }),
      check("archived", { archivedAt: TEST_NOW }),
    ];
    const subjectScope = {
      capabilityIds: ["cap1"],
      componentIds: ["api"],
      includeRelease: true,
    };
    assert.deepEqual(
      filterChecks(checks, [], { subjectScope }).map((item) => item.id),
      ["cap", "component", "release"],
    );
    assert.deepEqual(
      filterChecks(checks, [], {
        subjectScope: { ...subjectScope, includeRelease: false },
      }).map((item) => item.id),
      ["cap", "component"],
    );
  });

  it("shows required nonpasses and optional warnings without inventing unevaluated gates", () => {
    const checks = [
      "pass",
      "fail",
      "missing",
      "stale",
      "inconclusive",
      "optional",
      "unevaluated",
    ].map((id) => check(id, { required: id !== "optional" }));
    const evaluations = [
      result("pass", "pass"),
      result("fail", "fail"),
      result("missing", "missing"),
      result("stale", "stale"),
      result("inconclusive", "inconclusive"),
      { ...result("optional", "fail"), required: false },
    ];
    assert.deepEqual(
      filterChecks(checks, evaluations, { needsAttention: true }).map(
        (item) => item.id,
      ),
      ["fail", "missing", "stale", "inconclusive", "optional"],
    );
    assert.equal(checks.at(-2)?.required, false);
    assert.deepEqual(
      filterChecks(checks, evaluations, { result: "not_evaluated" }).map(
        (item) => item.id,
      ),
      ["unevaluated"],
    );
  });

  it("focuses exactly an active check even outside current filters", () => {
    const checks = [
      check("wanted"),
      check("other"),
      check("archived", { archivedAt: TEST_NOW }),
    ];
    const filters = {
      focusedCheckId: "wanted",
      operationsOnly: true,
      needsAttention: true,
      category: "security" as const,
      query: "no match",
      subjectScope: {
        capabilityIds: [],
        componentIds: [],
        includeRelease: false,
      },
    };
    assert.deepEqual(
      filterChecks(checks, [result("wanted", "pass")], filters).map(
        (item) => item.id,
      ),
      ["wanted"],
    );
    assert.deepEqual(
      filterChecks(checks, [], { focusedCheckId: "unknown" }),
      [],
    );
    assert.deepEqual(
      filterChecks(checks, [], { focusedCheckId: "archived" }),
      [],
    );
  });

  it("uses explicit categories for operations and includes all functional claims on request", () => {
    const checks = [
      check("operational", { category: "operational" }),
      check("security", { category: "security" }),
      check("data", { category: "data" }),
      check("functional-security", {
        claim: "Machine credentials cannot approve",
        category: "functional",
      }),
      check("functional-other", {
        claim: "Export completes",
        category: "functional",
      }),
      check("ux-security", {
        claim: "Security screen is comprehensible",
        category: "ux",
      }),
    ];
    assert.deepEqual(
      filterChecks(checks, [], { operationsOnly: true }).map((item) => item.id),
      ["operational", "security", "data"],
    );
    assert.deepEqual(
      filterChecks(checks, [], {
        operationsOnly: true,
        includeFunctional: true,
      }).map((item) => item.id),
      [
        "operational",
        "security",
        "data",
        "functional-security",
        "functional-other",
      ],
    );
  });

  it("combines result, category and case-insensitive claim/owner search", () => {
    const checks = [
      check("match", { ownerLabel: "Data Operations", category: "data" }),
      check("passed", { ownerLabel: "Data Operations", category: "data" }),
      check("other-category", {
        ownerLabel: "Data Operations",
        category: "functional",
      }),
    ];
    const evaluations = [
      result("match", "missing"),
      result("passed", "pass"),
      result("other-category", "missing"),
    ];
    assert.deepEqual(
      filterChecks(checks, evaluations, {
        result: "missing",
        category: "data",
        query: "  DATA operations  ",
      }).map((item) => item.id),
      ["match"],
    );
  });

  it("does not mutate readiness inputs or conceal a failure from the overall calculation", () => {
    const detail = releaseFixture();
    detail.evidence[0]!.result = "fail";
    const evaluation = evaluateRelease(detail, TEST_NOW);
    const before = structuredClone({ detail, evaluation });
    assert.deepEqual(
      filterChecks(detail.checks, evaluation.checks, { result: "pass" }),
      [],
    );
    assert.deepEqual({ detail, evaluation }, before);
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "blocked");
  });
});

describe("check focus location", () => {
  it("sets and clears only the check while preserving the perspective and fragment", () => {
    const href =
      "https://stateboard.example/boards/board/releases/release?view=operations&other=kept#review";
    const focused = checkFocusUrl(href, "check_1-A");
    assert.equal(
      focused,
      "/boards/board/releases/release?view=operations&other=kept&check=check_1-A#review",
    );
    assert.equal(
      checkFocusUrl(new URL(focused, href).href, null),
      "/boards/board/releases/release?view=operations&other=kept#review",
    );
  });
  it("does not carry malformed or unbounded identifiers into the location", () => {
    const href =
      "https://stateboard.example/releases/one?view=qa&check=previous";
    for (const id of ["a".repeat(129), "../other", "check with spaces", ""]) {
      assert.equal(checkFocusUrl(href, id), "/releases/one?view=qa");
    }
  });
});
