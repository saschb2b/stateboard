import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildReleaseProjection } from "./release-projection.ts";
import { decisionFixture } from "./release-test-data.ts";

const input = () => ({
  summary: "Invoice export reviewed",
  audience: "Finance users",
  capabilities: [
    {
      capabilityId: "cap1",
      name: "Invoice export",
      outcome: "Download a PDF",
      explanation: "Verified in staging",
    },
  ],
  assetIds: [],
});
describe("public release projection", () => {
  it("constructs only approved public fields without copying private provenance", () => {
    const projection = buildReleaseProjection(decisionFixture(), input());
    const json = JSON.stringify(projection);
    for (const privateText of [
      "internal.example",
      "Alice private identity",
      "sha256:",
      "run1",
      "configurationRef",
      "components",
      "actorId",
      "cap1",
    ])
      assert.equal(json.includes(privateText), false);
    assert.equal(projection.readiness, "ready");
    assert.equal(projection.capabilities[0]!.name, "Invoice export");
  });
  it("rejects cross-decision outcomes, duplicates and unretained media", () => {
    const unknown = input();
    unknown.capabilities[0]!.capabilityId = "foreign";
    assert.throws(() => buildReleaseProjection(decisionFixture(), unknown));
    const duplicate = input();
    duplicate.capabilities.push({ ...duplicate.capabilities[0]! });
    assert.throws(() => buildReleaseProjection(decisionFixture(), duplicate));
    assert.throws(() =>
      buildReleaseProjection(decisionFixture(), {
        ...input(),
        assetIds: ["private-other"],
      }),
    );
  });
  it("uses historical readiness rather than any subsequent live evidence", () => {
    const decision = decisionFixture();
    decision.snapshot.readiness.state = "blocked";
    assert.equal(
      buildReleaseProjection(decision, input()).readiness,
      "blocked",
    );
  });
  it("requires deliberate nonempty public copy and respects size caps", () => {
    assert.throws(() =>
      buildReleaseProjection(decisionFixture(), { ...input(), summary: "" }),
    );
    assert.throws(() =>
      buildReleaseProjection(decisionFixture(), {
        ...input(),
        summary: "x".repeat(2001),
      }),
    );
    assert.throws(() => buildReleaseProjection(decisionFixture(), null));
  });
});
