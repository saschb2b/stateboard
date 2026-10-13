import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateRelease,
  dependencySlice,
  affectedCapabilities,
} from "./readiness.ts";
import {
  evidenceRecord,
  productFixture,
  releaseFixture,
  TEST_NOW,
} from "./release-test-data.ts";

describe("release readiness", () => {
  it("requires a scoped capability and a required functional claim", () => {
    const detail = releaseFixture();
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "ready");
    detail.scope = [];
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "needs_evidence");
    detail.scope = releaseFixture().scope;
    detail.checks[0]!.category = "integration";
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "needs_evidence");
  });
  it("retains every gap while a required failure blocks", () => {
    const detail = releaseFixture();
    detail.evidence[0]!.result = "fail";
    detail.checks.push({
      ...detail.checks[0]!,
      id: "rollback",
      subjectType: "release",
      subjectId: null,
      category: "operational",
    });
    const result = evaluateRelease(detail, TEST_NOW);
    assert.equal(result.state, "blocked");
    assert.equal(result.blockers.length, 1);
    assert.equal(result.gaps.length, 1);
  });
  it("ignores mismatched candidate, environment, audience, configuration and definition", () => {
    for (const patch of [
      { candidateRef: "other" },
      { environment: "development" },
      { audience: "admins" },
      { configurationRef: "other" },
      { checkRevision: 2 },
    ]) {
      const detail = releaseFixture();
      detail.evidence = [evidenceRecord(patch)];
      assert.equal(evaluateRelease(detail, TEST_NOW).state, "needs_evidence");
    }
  });
  it("selects by observation time rather than arrival and never prefers passing evidence", () => {
    const detail = releaseFixture();
    detail.evidence = [
      evidenceRecord({
        id: "older-arrived-last",
        sequence: 3,
        observedAt: TEST_NOW - 2000,
      }),
      evidenceRecord({
        id: "failed",
        sequence: 2,
        result: "fail",
        observedAt: TEST_NOW - 1000,
      }),
    ];
    const result = evaluateRelease(detail, TEST_NOW);
    assert.equal(result.state, "blocked");
    assert.equal(result.checks[0]!.evidenceId, "failed");
  });
  it("uses sequence as a deterministic tie-breaker", () => {
    const detail = releaseFixture();
    detail.evidence.push(
      evidenceRecord({ id: "failed", sequence: 2, result: "fail" }),
    );
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "blocked");
  });
  it("expires a pass exactly at the boundary and keeps a selected stale failure blocked", () => {
    const detail = releaseFixture();
    const expires = detail.evidence[0]!.observedAt + detail.checks[0]!.maxAgeMs;
    assert.equal(evaluateRelease(detail, expires - 1).state, "ready");
    assert.equal(evaluateRelease(detail, expires).state, "needs_evidence");
    detail.evidence[0]!.result = "fail";
    assert.equal(evaluateRelease(detail, expires).state, "blocked");
  });
  it("inconclusive and stale newest results cannot fall back to a prior pass", () => {
    const detail = releaseFixture();
    detail.evidence.push(
      evidenceRecord({
        id: "newer",
        sequence: 2,
        result: "inconclusive",
        observedAt: TEST_NOW,
      }),
    );
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "needs_evidence");
    detail.evidence[1]!.result = "pass";
    assert.equal(
      evaluateRelease(detail, TEST_NOW + detail.checks[0]!.maxAgeMs).state,
      "needs_evidence",
    );
  });
  it("does not let optional failures or unconfigured graph components become release gates", () => {
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "optional",
      required: false,
      category: "ux",
    });
    detail.evidence.push(
      evidenceRecord({
        id: "optional-fail",
        checkId: "optional",
        result: "fail",
      }),
    );
    const result = evaluateRelease(detail, TEST_NOW);
    assert.equal(result.state, "ready");
    assert.equal(result.warnings.length, 1);
  });
  it("a new definition invalidates old evidence; excluded capability checks stop gating", () => {
    const detail = releaseFixture();
    detail.checks[0]!.revision = 2;
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "needs_evidence");
    detail.checks = releaseFixture().checks;
    detail.scope.push({
      ...detail.scope[0]!,
      capabilityId: "excluded",
      included: false,
    });
    detail.checks.push({
      ...detail.checks[0]!,
      id: "excluded",
      subjectId: "excluded",
    });
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "ready");
  });
  it("rejects future observations and does not mutate its input", () => {
    const detail = releaseFixture();
    detail.evidence[0]!.observedAt = TEST_NOW + 1;
    const original = JSON.stringify(detail);
    assert.equal(evaluateRelease(detail, TEST_NOW).state, "needs_evidence");
    assert.equal(JSON.stringify(detail), original);
  });
});
describe("declared dependency navigation", () => {
  it("deduplicates cycles and finds reverse capability impact", () => {
    const product = productFixture();
    assert.equal(dependencySlice(product, "cap1").components.length, 3);
    assert.equal(dependencySlice(product, "cap1", 1).truncated, true);
    assert.deepEqual(
      affectedCapabilities(product, "worker").map((c) => c.id),
      ["cap1"],
    );
  });
});
