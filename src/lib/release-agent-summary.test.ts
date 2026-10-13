import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgentReadiness } from "./release-agent-summary.ts";
import { evaluateRelease } from "./readiness.ts";
import {
  decisionFixture,
  productFixture,
  releaseFixture,
  TEST_NOW,
} from "./release-test-data.ts";
import type { ReleaseDetail } from "./release-types.ts";

function summary(detail: ReleaseDetail, now = TEST_NOW) {
  return buildAgentReadiness({
    ...detail,
    product: productFixture(),
    readiness: evaluateRelease(detail, now),
  });
}

describe("agent readiness report", () => {
  it("gives unresolved claim, owner, method and exact context without changing the verdict", () => {
    const detail = releaseFixture();
    detail.evidence[0]!.result = "fail";
    detail.checks.push({
      ...detail.checks[0]!,
      id: "restore",
      subjectType: "release",
      subjectId: null,
      category: "operational",
      environment: "production",
    });
    const report = summary(detail);
    assert.equal(report.readiness.state, "blocked");
    assert.deepEqual(
      report.findings.map(({ check, evaluation }) => [
        check.id,
        evaluation.state,
      ]),
      [
        ["check1", "fail"],
        ["restore", "missing"],
      ],
    );
    assert.equal(report.findings[0]!.check.method, "End-to-end test");
    assert.equal(report.findings[0]!.check.ownerLabel, "Documents");
    assert.equal(
      report.assessment.candidateRef,
      detail.assessment.candidateRef,
    );
    assert.equal(report.reviewPath, "/boards/board1/releases/release1");
  });

  it("identifies missing required acceptance definitions while excluding out-of-scope capabilities", () => {
    const detail = releaseFixture();
    detail.checks[0]!.required = false;
    detail.scope.push({
      ...detail.scope[0]!,
      capabilityId: "out-of-scope",
      included: false,
    });
    const report = summary(detail);
    assert.equal(report.readiness.state, "needs_evidence");
    assert.deepEqual(
      report.uncoveredCapabilities.map((item) => item.capabilityId),
      ["cap1"],
    );
    assert.deepEqual(report.findings, []);
  });

  it("keeps optional warnings visible without making them blockers", () => {
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "optional",
      required: false,
    });
    const report = summary(detail);
    assert.equal(report.readiness.state, "ready");
    assert.equal(report.findings[0]!.check.required, false);
    assert.equal(report.findings[0]!.evaluation.state, "missing");
  });

  it("does not present an expired or older decision as current and omits saved private snapshots", () => {
    const detail = releaseFixture();
    const decision = decisionFixture();
    detail.decisions = [decision];
    assert.equal(summary(detail).latestDecision?.current, true);
    assert.equal(
      summary(detail, decision.expiresAt!).latestDecision?.current,
      false,
    );
    detail.assessment.revision++;
    assert.equal(summary(detail).latestDecision?.current, false);
    assert.equal("snapshot" in summary(detail).latestDecision!, false);
    assert.equal(
      JSON.stringify(summary(detail)).includes("Alice private identity"),
      false,
    );
  });
});
