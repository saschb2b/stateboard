import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { productFixture, releaseFixture } from "../../lib/release-test-data.ts";
import { dependencyFocus, productComponentFocus } from "./dependency-focus.ts";

describe("dependency presentation focus", () => {
  it("keeps component-check subjects and their providers, without pulling in another product", () => {
    const product = productFixture();
    product.components.push(
      ...["restore-agent", "backup-store", "other-product"].map((id) => ({
        ...product.components[0]!,
        id,
        name: id,
      })),
    );
    product.capabilityComponents.push({
      ...product.capabilityComponents[0]!,
      capabilityId: "other-capability",
      componentId: "other-product",
    });
    product.dependencies.push({
      ...product.dependencies[0]!,
      id: "backup",
      consumerId: "restore-agent",
      providerId: "backup-store",
      required: false,
    });
    const detail = releaseFixture();
    detail.checks.push({
      ...detail.checks[0]!,
      id: "restore-check",
      subjectType: "component",
      subjectId: "restore-agent",
    });
    const focus = dependencyFocus(product, detail);
    assert.deepEqual(
      focus.assessmentComponents.map((component) => component.id),
      ["api", "queue", "worker", "restore-agent", "backup-store"],
    );
    assert.equal(focus.checkScope, null);
    assert.equal(
      focus.dependencies.find((link) => link.id === "backup")?.required,
      false,
    );
    assert.deepEqual(productComponentFocus(product).componentIds, [
      "api",
      "queue",
      "worker",
    ]);
  });

  it("terminates cycles and scopes to an included outcome with supporting context", () => {
    const product = productFixture();
    const detail = releaseFixture();
    const focus = dependencyFocus(product, detail, "cap1");
    assert.deepEqual(focus.checkScope, {
      capabilityIds: ["cap1"],
      componentIds: ["api", "queue", "worker"],
      includeRelease: true,
    });
    assert.equal(focus.dependencies.length, 3);
    assert.equal(focus.truncated, false);
    assert.equal(dependencyFocus(product, detail).checkScope, null);
  });

  it("finds reverse impact only among included capabilities and preserves the selected component", () => {
    const product = productFixture();
    const detail = releaseFixture();
    product.capabilityComponents.push({
      ...product.capabilityComponents[0]!,
      capabilityId: "excluded",
    });
    detail.scope.push({
      ...detail.scope[0]!,
      capabilityId: "excluded",
      included: false,
    });
    const focus = dependencyFocus(product, detail, null, "worker");
    assert.deepEqual(
      focus.impacted.map((item) => item.capabilityId),
      ["cap1"],
    );
    assert.deepEqual(focus.checkScope, {
      capabilityIds: ["cap1"],
      componentIds: ["api", "worker", "queue"],
      includeRelease: true,
    });
  });

  it("reports the bound without treating omitted context as readiness", () => {
    const product = productFixture();
    const detail = releaseFixture();
    const before = JSON.stringify({ product, detail });
    const focus = dependencyFocus(product, detail, "cap1", null, 2);
    assert.equal(focus.components.length, 2);
    assert.equal(focus.truncated, true);
    assert.deepEqual(focus.checkScope?.componentIds, ["api", "queue"]);
    assert.equal(JSON.stringify({ product, detail }), before);
  });
});
