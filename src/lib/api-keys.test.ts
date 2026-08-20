import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  API_KEY_PREFIX,
  bearerApiKey,
  generateApiKey,
  hashApiKey,
  isApiKeyFormat,
} from "./api-keys.ts";
import {
  DEFAULT_API_KEY_EXPIRY_DAYS,
  MAX_API_KEY_EXPIRY_DAYS,
  apiKeyExpiryStatus,
  minRole,
  parseExpiresInDays,
} from "./types.ts";

describe("generateApiKey", () => {
  it("produces a well-formed key with matching hash and prefix", () => {
    const { key, keyHash, keyPrefix } = generateApiKey();
    assert.equal(isApiKeyFormat(key), true);
    assert.equal(keyHash, hashApiKey(key));
    assert.equal(keyPrefix, key.slice(0, API_KEY_PREFIX.length + 8));
  });

  it("never repeats", () => {
    const keys = new Set(
      Array.from({ length: 100 }, () => generateApiKey().key),
    );
    assert.equal(keys.size, 100);
  });
});

describe("hashApiKey", () => {
  it("is deterministic sha256 hex", () => {
    assert.equal(hashApiKey("sbk_x"), hashApiKey("sbk_x"));
    assert.match(hashApiKey("sbk_x"), /^[0-9a-f]{64}$/);
    assert.notEqual(hashApiKey("sbk_x"), hashApiKey("sbk_y"));
  });
});

describe("isApiKeyFormat", () => {
  it("accepts generated keys only", () => {
    assert.equal(isApiKeyFormat(generateApiKey().key), true);
    for (const bad of [
      null,
      42,
      "",
      "sbk_short",
      `${"sbk_"}${"a".repeat(44)}`, // one char too long
      `xyz_${"a".repeat(43)}`, // wrong prefix
      `sbk_${"a".repeat(42)}!`, // non-base64url char
    ]) {
      assert.equal(isApiKeyFormat(bad), false);
    }
  });
});

describe("bearerApiKey", () => {
  const key = generateApiKey().key;

  it("extracts the key from a Bearer header, scheme case-insensitive", () => {
    assert.equal(bearerApiKey(`Bearer ${key}`), key);
    assert.equal(bearerApiKey(`bearer ${key}`), key);
    assert.equal(bearerApiKey(`  Bearer  ${key}  `), key);
  });

  it("returns null for absent, non-Bearer, or foreign tokens", () => {
    assert.equal(bearerApiKey(null), null);
    assert.equal(bearerApiKey(""), null);
    assert.equal(bearerApiKey(key), null); // no scheme
    assert.equal(bearerApiKey(`Basic ${key}`), null);
    assert.equal(bearerApiKey("Bearer eyJhbGciOi.some.jwt"), null);
  });
});

describe("parseExpiresInDays", () => {
  const now = 1_700_000_000_000;
  const day = 86_400_000;

  it("defaults an absent value to 90 days out", () => {
    assert.deepEqual(parseExpiresInDays(undefined, now), {
      ok: true,
      expiresAt: now + DEFAULT_API_KEY_EXPIRY_DAYS * day,
    });
  });

  it("treats explicit null as no expiration", () => {
    assert.deepEqual(parseExpiresInDays(null, now), {
      ok: true,
      expiresAt: null,
    });
  });

  it("accepts whole days within [1, max]", () => {
    assert.deepEqual(parseExpiresInDays(1, now), {
      ok: true,
      expiresAt: now + day,
    });
    assert.deepEqual(parseExpiresInDays(MAX_API_KEY_EXPIRY_DAYS, now), {
      ok: true,
      expiresAt: now + MAX_API_KEY_EXPIRY_DAYS * day,
    });
  });

  it("rejects zero, negatives, fractions, overflow, and non-numbers", () => {
    for (const bad of [0, -1, 0.5, MAX_API_KEY_EXPIRY_DAYS + 1, "30", NaN]) {
      assert.equal(parseExpiresInDays(bad, now).ok, false, String(bad));
    }
  });
});

describe("apiKeyExpiryStatus", () => {
  const now = 1_700_000_000_000;
  const day = 86_400_000;

  it("never-expiring keys are active", () => {
    assert.equal(apiKeyExpiryStatus(null, now), "active");
  });

  it("flags the 14-day warning window, boundaries included", () => {
    assert.equal(apiKeyExpiryStatus(now + 15 * day, now), "active");
    assert.equal(apiKeyExpiryStatus(now + 14 * day, now), "expiring-soon");
    assert.equal(apiKeyExpiryStatus(now + 1, now), "expiring-soon");
  });

  it("expiry is exclusive at the instant: <= now is expired", () => {
    assert.equal(apiKeyExpiryStatus(now, now), "expired");
    assert.equal(apiKeyExpiryStatus(now - 1, now), "expired");
  });
});

describe("minRole", () => {
  it("returns the lower-ranked role regardless of order", () => {
    assert.equal(minRole("owner", "viewer"), "viewer");
    assert.equal(minRole("viewer", "owner"), "viewer");
    assert.equal(minRole("editor", "owner"), "editor");
    assert.equal(minRole("editor", "editor"), "editor");
  });
});
