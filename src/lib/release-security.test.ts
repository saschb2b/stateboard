import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTrustedMutationOrigin,
  parseExpectedRevision,
  mutationIdError,
} from "./release-security.ts";

describe("release mutation boundaries", () => {
  it("requires a same-origin browser request", () => {
    const url = "https://board.example/api/releases/r/decisions";
    assert.equal(isTrustedMutationOrigin(url, new Headers()), false);
    assert.equal(
      isTrustedMutationOrigin(url, new Headers({ origin: "null" })),
      false,
    );
    assert.equal(
      isTrustedMutationOrigin(
        url,
        new Headers({ origin: "https://attacker.example" }),
      ),
      false,
    );
    assert.equal(
      isTrustedMutationOrigin(
        url,
        new Headers({ origin: "https://board.example" }),
      ),
      true,
    );
    assert.equal(
      isTrustedMutationOrigin(
        url,
        new Headers({
          origin: "https://board.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
      false,
    );
    assert.equal(
      isTrustedMutationOrigin(
        url,
        new Headers({ origin: "https://board.example/untrusted" }),
      ),
      false,
    );
  });

  it("uses the configured external deployment origin behind a proxy", () => {
    const headers = new Headers({ origin: "https://board.example" });
    assert.equal(
      isTrustedMutationOrigin(
        "http://localhost:3000/api/releases",
        headers,
        "https://board.example",
      ),
      true,
    );
    assert.equal(
      isTrustedMutationOrigin(
        "http://localhost:3000/api/releases",
        new Headers({ origin: "http://localhost:3000" }),
        "https://board.example",
      ),
      false,
    );
  });

  it("rejects absent, coerced, fractional and unsafe revisions", () => {
    for (const value of [
      undefined,
      null,
      "1",
      0,
      -1,
      1.1,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      assert.equal(parseExpectedRevision(value), null);
    }
    assert.equal(parseExpectedRevision(1), 1);
  });

  it("keeps creation identities under server control", () => {
    for (const type of [
      "capability.create",
      "component.create",
      "dependency.create",
      "check.create",
      "evidence.create",
    ]) {
      assert.equal(mutationIdError(type, undefined), null);
      for (const id of ["", "existing", null, 42, "x".repeat(201)])
        assert.ok(mutationIdError(type, id));
    }
  });

  it("requires safe existing IDs for destructive and revision actions", () => {
    for (const type of [
      "capability.update",
      "capability.archive",
      "component.update",
      "component.archive",
      "dependency.delete",
      "check.revise",
      "check.archive",
    ]) {
      for (const id of [
        undefined,
        "",
        null,
        42,
        "../other",
        "with spaces",
        "x".repeat(201),
      ])
        assert.ok(mutationIdError(type, id));
      assert.equal(mutationIdError(type, "a_b-42"), null);
    }
  });

  it("uses relationship subject IDs rather than an unrelated envelope ID", () => {
    for (const type of [
      "scope.put",
      "capability_component.put",
      "capability_component.delete",
      "region_capability.put",
      "region_capability.delete",
    ]) {
      assert.equal(mutationIdError(type, undefined), null);
      assert.ok(mutationIdError(type, "unrelated"));
    }
  });
});
