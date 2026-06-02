import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { maskSecret, redactDbUrl } from "./redact-db-url.mjs";

describe("maskSecret", () => {
  it("hides short secrets entirely (a few chars would expose most of them)", () => {
    assert.equal(maskSecret(""), "***");
    assert.equal(maskSecret("hunter2"), "***");
    assert.equal(maskSecret("12345678"), "***"); // exactly 8 → still hidden
  });

  it("reveals 2 chars per end for medium secrets (9–16 chars)", () => {
    assert.equal(maskSecret("123456789"), "12***89"); // 9
    assert.equal(maskSecret("abcdefghijklmnop"), "ab***op"); // 16
  });

  it("reveals 3 chars per end for longer secrets (17+ chars)", () => {
    assert.equal(maskSecret("abcdefghijklmnopq"), "abc***opq"); // 17
    assert.equal(maskSecret("0123456789abcdef0123"), "012***123"); // 20
  });

  it("never echoes the middle of a long secret", () => {
    const secret = "S3cr3t-P@ssw0rd-With-Lots-Of-Entropy";
    const masked = maskSecret(secret);
    assert.ok(!masked.includes(secret));
    assert.ok(!masked.includes("ssw0rd"));
  });
});

describe("redactDbUrl", () => {
  it("returns a placeholder for empty / non-string input", () => {
    assert.equal(redactDbUrl(""), "(empty)");
    assert.equal(redactDbUrl(undefined), "(empty)");
    assert.equal(redactDbUrl(null), "(empty)");
  });

  it("leaves strings without a 'user:pass@' alone", () => {
    assert.equal(redactDbUrl("not a url at all"), "not a url at all");
    // host-only — nothing to redact
    assert.equal(
      redactDbUrl("postgres://localhost:5432/sb"),
      "postgres://localhost:5432/sb",
    );
    // userinfo carries a user but no password
    assert.equal(
      redactDbUrl("postgres://user@db.internal:5432/sb"),
      "postgres://user@db.internal:5432/sb",
    );
  });

  it("masks the password while keeping scheme, user, host, port, db", () => {
    assert.equal(
      redactDbUrl("postgres://sbuser:password123@db.internal:5432/sb"),
      "postgres://sbuser:pa***23@db.internal:5432/sb",
    );
  });

  it("handles base64 passwords with URL-reserved chars without leaking them", () => {
    // The regression that prompted this code path: `openssl rand -base64`
    // passwords contain '/', '+', '=' that break the URL parser. Redaction
    // works on the raw string, so it must still abbreviate cleanly.
    const password = "Xy9/Kd2+Lm8nQp4rStUvWxYz0123==";
    const url = `postgres://sbuser:${password}@db.internal:5432/sb`;
    const out = redactDbUrl(url);
    assert.ok(!out.includes(password), "full password must not appear");
    assert.ok(
      out.includes("db.internal:5432/sb"),
      "host/db kept for debugging",
    );
    assert.ok(out.startsWith("postgres://sbuser:"));
  });

  it("splits userinfo on the first ':' so a password with a colon stays hidden", () => {
    // password is "p:a:ss" (6 chars → fully hidden); the extra colons must not
    // confuse the userinfo split.
    assert.equal(
      redactDbUrl("postgres://user:p:a:ss@host/db"),
      "postgres://user:***@host/db",
    );
  });

  it("uses the last '@' as the host delimiter when the password contains one", () => {
    assert.equal(
      redactDbUrl("postgres://user:p@ssword@db.host:5432/sb"),
      "postgres://user:***@db.host:5432/sb",
    );
  });
});
