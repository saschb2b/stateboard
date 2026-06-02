import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAllowedUploadFilename } from "./uploads.ts";
import { newId } from "./ids.ts";

describe("isAllowedUploadFilename", () => {
  it("accepts the shapes the upload handler actually generates", () => {
    for (const name of [
      "V1StGXR8_Z5j.png", // nanoid-style id, underscore + capitals
      "abcdef.jpg",
      "abcdef.jpeg",
      "abc-def_123.webp",
      "abcdef.gif",
      "a".repeat(32) + ".png", // max id length
      "abcde1.png", // min id length (6)
    ]) {
      assert.equal(isAllowedUploadFilename(name), true, name);
    }
  });

  it("every generated `${newId()}.<ext>` is servable (generate↔serve contract)", () => {
    // If newId's length or alphabet ever drifts past the serve allowlist,
    // uploads would 404 on read — catch that here rather than in prod.
    for (let i = 0; i < 50; i++) {
      for (const ext of ["png", "jpg", "webp", "gif"]) {
        const name = `${newId()}.${ext}`;
        assert.equal(isAllowedUploadFilename(name), true, name);
      }
    }
  });

  it("rejects path-traversal attempts", () => {
    for (const name of [
      "../secret.png",
      "../../etc/passwd.png",
      "..\\windows\\win.png",
      "/etc/passwd.png",
      "abc/def.png",
      "foo/../bar.png",
      "..png", // leading dot-dot, no id
    ]) {
      assert.equal(isAllowedUploadFilename(name), false, name);
    }
  });

  it("rejects disallowed extensions and double extensions", () => {
    for (const name of [
      "abcdef.svg", // SVG can carry script — never served
      "abcdef.html",
      "abcdef.php",
      "abcdef.exe",
      "abcdef", // no extension
      "abcdef.png.php", // real ext is .php
      "evil.php.png", // dot in the id segment
      "abcdef.PNG", // extension is case-sensitive (we only emit lowercase)
    ]) {
      assert.equal(isAllowedUploadFilename(name), false, name);
    }
  });

  it("rejects out-of-range id lengths and stray characters", () => {
    for (const name of [
      "abc.png", // id too short (< 6)
      "a".repeat(33) + ".png", // id too long (> 32)
      "abc def.png", // space
      "abcdef.png ", // trailing space
      "abcdef\x00.png", // null byte
      "abcd€f.png", // non-ASCII
      "", // empty
    ]) {
      assert.equal(isAllowedUploadFilename(name), false, JSON.stringify(name));
    }
  });
});
