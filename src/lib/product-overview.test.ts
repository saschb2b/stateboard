import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRelease } from "./readiness.ts";
import {
  buildProductOverview,
  buildReleaseOverviewCoverage,
} from "./product-overview.ts";
import {
  evidenceRecord,
  productFixture,
  releaseFixture,
  TEST_NOW,
} from "./release-test-data.ts";
import type { ReleaseDetail, ReleaseOverview } from "./release-types.ts";

function overviewFor(detail: ReleaseDetail): ReleaseOverview {
  const readiness = evaluateRelease(detail, TEST_NOW);
  return {
    assessment: detail.assessment,
    state: readiness.state,
    blockerCount: readiness.blockers.length,
    gapCount: readiness.gaps.length,
    evaluatedAt: readiness.evaluatedAt,
    validUntil: readiness.validUntil,
    decision: null,
    decisionRevision: null,
    decisionAt: null,
    coverage: buildReleaseOverviewCoverage(
      detail.scope,
      detail.checks,
      readiness,
    ),
  };
}

describe("product overview presentation", () => {
  it("keeps empty categories distinct from passing checks", () => {
    const detail = releaseFixture();
    detail.checks = [];
    detail.evidence = [];
    const result = buildProductOverview(
      productFixture(),
      overviewFor(detail),
      TEST_NOW,
    );
    assert.equal(result.state, "needs_evidence");
    assert.equal(result.categories.length, 6);
    assert.ok(
      result.categories.every((category) => category.state === "not_defined"),
    );
    assert.equal(result.missingAcceptance[0]?.capabilityId, "cap1");
    assert.equal(result.capabilities[0]?.state, "needs_evidence");
  });

  it("keeps optional-only warnings separate from required readiness", () => {
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "optional",
      subjectType: "release",
      subjectId: null,
      category: "security",
      required: false,
    });
    const result = buildProductOverview(
      productFixture(),
      overviewFor(detail),
      TEST_NOW,
    );
    const security = result.categories.find(
      (category) => category.category === "security",
    );
    assert.equal(result.state, "ready");
    assert.equal(security?.state, "optional_only");
    assert.equal(security?.required, 0);
    assert.equal(security?.optionalWarnings, 1);
    assert.equal(result.findings.length, 0);
  });

  it("distinguishes excluded capabilities from outcomes never added to scope", () => {
    const product = productFixture();
    const detail = releaseFixture();
    for (const id of ["excluded", "later"]) {
      product.capabilities.push({ ...product.capabilities[0]!, id, name: id });
    }
    detail.scope.push({
      ...detail.scope[0]!,
      capabilityId: "excluded",
      name: "excluded",
      included: false,
      scopeReason: "Deferred to a later candidate",
    });
    detail.checks.push({
      ...detail.checks[0]!,
      id: "excluded-check",
      subjectId: "excluded",
    });
    const result = buildProductOverview(product, overviewFor(detail), TEST_NOW);
    assert.equal(
      result.capabilities.find((item) => item.capabilityId === "excluded")
        ?.inclusion,
      "excluded",
    );
    assert.equal(
      result.capabilities.find((item) => item.capabilityId === "excluded")
        ?.state,
      null,
    );
    assert.equal(
      result.capabilities.find((item) => item.capabilityId === "later")
        ?.inclusion,
      "not_scoped",
    );
    assert.equal(result.checks.length, 1);
    assert.equal(result.state, "ready");
  });

  it("keeps absent legacy coverage unknown and does not infer scope", () => {
    const overview = overviewFor(releaseFixture());
    delete overview.coverage;
    const result = buildProductOverview(productFixture(), overview, TEST_NOW);
    assert.equal(result.coverageKnown, false);
    assert.ok(
      result.categories.every((category) => category.state === "unknown"),
    );
    assert.equal(result.capabilities[0]?.inclusion, "unknown");
    assert.equal(result.capabilities[0]?.state, null);
    assert.equal(result.state, "ready");
    const noAssessment = buildProductOverview(
      productFixture(),
      undefined,
      TEST_NOW,
    );
    assert.equal(noAssessment.state, null);
    assert.equal(noAssessment.capabilities[0]?.inclusion, "not_scoped");
    const product = productFixture();
    product.releases = [releaseFixture().assessment];
    const missingOverview = buildProductOverview(product, undefined, TEST_NOW);
    assert.equal(missingOverview.capabilities[0]?.inclusion, "unknown");
  });

  it("lets optional evidence expire without lowering required readiness", () => {
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "optional",
      required: false,
      category: "ux",
      maxAgeMs: 2_000,
    });
    detail.evidence.push(
      evidenceRecord({ id: "optional-pass", checkId: "optional" }),
    );
    const result = buildProductOverview(
      productFixture(),
      overviewFor(detail),
      TEST_NOW + 1_000,
    );
    assert.equal(result.state, "ready");
    assert.equal(result.capabilities[0]?.state, "ready");
    assert.equal(result.capabilities[0]?.optionalWarnings, 1);
    assert.equal(
      result.categories.find((category) => category.category === "ux")?.state,
      "optional_only",
    );
    assert.equal(result.findings.length, 0);
  });

  it("projects only effective checks evaluated for the assessment", () => {
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "archived",
      archivedAt: TEST_NOW,
    });
    const coverage = overviewFor(detail).coverage!;
    assert.deepEqual(
      coverage.checks.map((check) => check.id),
      ["check1"],
    );
    assert.equal(coverage.checks[0]?.evidenceId, "e1");
    assert.equal("evidence" in coverage, false);
    assert.equal("decisions" in coverage, false);
    assert.equal("assets" in coverage, false);
  });

  it("counts declared product relationships without workspace-only components", () => {
    const product = productFixture();
    product.components.push({
      ...product.components[0]!,
      id: "another-product",
    });
    product.capabilityComponents.push({
      ...product.capabilityComponents[0]!,
      capabilityId: "another-capability",
      componentId: "another-product",
    });
    const result = buildProductOverview(
      product,
      overviewFor(releaseFixture()),
      TEST_NOW,
    );
    assert.equal(result.counts.components, 3);
    assert.equal(result.counts.dependencies, 3);
    assert.equal(result.capabilities[0]?.componentCount, 3);
    assert.equal(result.state, "ready");
  });

  it("counts mapped screens once without treating region states as verification", () => {
    const product = productFixture();
    product.screens = [
      {
        id: "screen",
        boardId: "board1",
        filename: "screen.png",
        mimeType: "image/png",
        width: 800,
        height: 600,
        label: "Invoice",
        position: 0,
        createdAt: TEST_NOW,
        mediaUrl: "/screen.png",
        regions: ["region1", "region2"].map((id) => ({
          id,
          screenId: "screen",
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          state: "missing",
          label: null,
          notes: null,
          createdAt: TEST_NOW,
          updatedAt: TEST_NOW,
          updatedBy: null,
        })),
      },
    ];
    product.regionCapabilities = ["region1", "region2"].map((regionId) => ({
      regionId,
      capabilityId: "cap1",
    }));
    const result = buildProductOverview(
      product,
      overviewFor(releaseFixture()),
      TEST_NOW,
    );
    assert.equal(result.capabilities[0]?.screenCount, 1);
    assert.equal(result.counts.mappedScreens, 1);
    assert.equal(result.state, "ready");
  });

  it("expires passing checks without changing a required failure into a gap", () => {
    const detail = releaseFixture();
    const readyOverview = overviewFor(detail);
    const expiresAt = readyOverview.validUntil!;
    const expired = buildProductOverview(
      productFixture(),
      readyOverview,
      expiresAt,
    );
    assert.equal(expired.state, "needs_evidence");
    assert.equal(expired.checks[0]?.state, "stale");
    assert.equal(expired.capabilities[0]?.state, "needs_evidence");
    assert.equal(expired.findings.length, 1);
    assert.equal(readyOverview.coverage?.checks[0]?.state, "pass");
    detail.evidence[0]!.result = "fail";
    const failed = buildProductOverview(
      productFixture(),
      overviewFor(detail),
      expiresAt + 1,
    );
    assert.equal(failed.state, "blocked");
    assert.equal(failed.checks[0]?.state, "fail");
    assert.equal(failed.categories[0]?.blockers, 1);
  });

  it("preserves the server evaluation time if a browser clock is behind", () => {
    const overview = overviewFor(releaseFixture());
    const result = buildProductOverview(
      productFixture(),
      overview,
      TEST_NOW - 100_000,
    );
    assert.equal(result.state, "ready");
    assert.equal(result.checks[0]?.state, "pass");
  });

  it("keeps retained outcomes and marks newer product definitions", () => {
    const product = productFixture();
    product.capabilities[0]!.definitionRevision = 2;
    product.capabilities[0]!.outcome = "Receive a signed PDF";
    const result = buildProductOverview(
      product,
      overviewFor(releaseFixture()),
      TEST_NOW,
    );
    assert.equal(result.capabilities[0]?.outcome, "Receive a PDF");
    assert.equal(
      result.capabilities[0]?.productCapability?.outcome,
      "Receive a signed PDF",
    );
    assert.equal(result.capabilities[0]?.newerDefinition, true);
    assert.equal(result.capabilities[0]?.state, "ready");
  });

  it("shows passing capability checks alongside a blocking global dependency check", () => {
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "dependency",
      subjectType: "component",
      subjectId: "api",
      category: "integration",
    });
    detail.evidence.push(
      evidenceRecord({ id: "failed", checkId: "dependency", result: "fail" }),
    );
    const result = buildProductOverview(
      productFixture(),
      overviewFor(detail),
      TEST_NOW,
    );
    assert.equal(result.state, "blocked");
    assert.equal(result.capabilities[0]?.state, "ready");
    assert.equal(result.capabilities[0]?.blockers, 0);
    assert.equal(result.findings[0]?.id, "dependency");
  });

  it("retains archived scoped outcomes without counting their mappings as current product architecture", () => {
    const product = productFixture();
    product.capabilities[0]!.archivedAt = TEST_NOW;
    const result = buildProductOverview(
      product,
      overviewFor(releaseFixture()),
      TEST_NOW,
    );
    assert.equal(result.capabilities[0]?.archived, true);
    assert.equal(result.capabilities[0]?.inclusion, "included");
    assert.equal(result.counts.activeCapabilities, 0);
    assert.equal(result.counts.components, 0);
  });

  it("does not combine a different board's candidate with product mappings", () => {
    const overview = overviewFor(releaseFixture());
    overview.assessment.boardId = "other-board";
    const result = buildProductOverview(productFixture(), overview, TEST_NOW);
    assert.equal(result.state, null);
    assert.equal(result.coverageKnown, false);
    assert.equal(result.capabilities[0]?.inclusion, "not_scoped");
  });
});
