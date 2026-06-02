import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readImageDims } from "./image.ts";

/**
 * Build an image fixture from a (whitespace-grouped) hex string, right-padded
 * with zeros to `padTo` bytes. Grouping is purely for readability — the spaces
 * are stripped before decoding.
 */
function img(hex: string, padTo = 0): Buffer {
  const base = Buffer.from(hex.replace(/\s+/g, ""), "hex");
  if (base.length >= padTo) return base;
  return Buffer.concat([base, Buffer.alloc(padTo - base.length)]);
}

// --- Minimal but valid fixtures, one per format ----------------------------
// Byte groups, in order, are annotated above each fixture.

// PNG  signature | IHDR len | "IHDR" | width@16 (BE) | height@20 (BE) — 800x600
const PNG = img("89504e47 0d0a1a0a 0000000d 49484452 00000320 00000258");

// GIF  "GIF89a" | width@6 (LE) | height@8 (LE) — 640x480
const GIF = img("474946383961 8002 e001", 16);

// JPEG  SOI | SOF0 | seglen | precision | height (BE) | width (BE) — 800x600
const JPEG_SOF0 = img("ffd8 ffc0 0011 08 0258 0320", 16);

// JPEG  SOI | APP0 | len(4) | payload | SOF0 | seglen | prec | h | w — 1280x720
const JPEG_WITH_APP0 = img("ffd8 ffe0 0004 0000 ffc0 0011 08 02d0 0500");

// WebP VP8 (lossy)  RIFF | size | WEBP | "VP8 " | chunk | frametag |
//                   startcode | width@26 (LE) | height@28 (LE) — 800x600
const WEBP_VP8 = img(
  "52494646 00000000 57454250 56503820 00000000 000000 9d012a 2003 5802",
);

// WebP VP8L (lossless)  …| "VP8L" | chunk | sig(0x2f) | packed dims — 801x601
const WEBP_VP8L = img(
  "52494646 00000000 57454250 5650384c 00000000 2f 20039600",
  30,
);

// WebP VP8X (extended)  …| "VP8X" | chunk | flags | reserved |
//                       canvas w-1@24 (LE) | canvas h-1@27 (LE) — 1000x800
const WEBP_VP8X = img(
  "52494646 00000000 57454250 56503858 00000000 00 000000 e70300 1f0300",
  31,
);

describe("readImageDims — valid fixtures", () => {
  it("reads PNG dimensions", () => {
    assert.deepEqual(readImageDims(PNG), {
      width: 800,
      height: 600,
      mimeType: "image/png",
    });
  });

  it("reads GIF dimensions", () => {
    assert.deepEqual(readImageDims(GIF), {
      width: 640,
      height: 480,
      mimeType: "image/gif",
    });
  });

  it("reads JPEG dimensions from a leading SOF0 segment", () => {
    assert.deepEqual(readImageDims(JPEG_SOF0), {
      width: 800,
      height: 600,
      mimeType: "image/jpeg",
    });
  });

  it("reads JPEG dimensions after skipping an APP0 segment", () => {
    assert.deepEqual(readImageDims(JPEG_WITH_APP0), {
      width: 1280,
      height: 720,
      mimeType: "image/jpeg",
    });
  });

  it("reads WebP VP8 (lossy) dimensions", () => {
    assert.deepEqual(readImageDims(WEBP_VP8), {
      width: 800,
      height: 600,
      mimeType: "image/webp",
    });
  });

  it("reads WebP VP8L (lossless) dimensions", () => {
    assert.deepEqual(readImageDims(WEBP_VP8L), {
      width: 801,
      height: 601,
      mimeType: "image/webp",
    });
  });

  it("reads WebP VP8X (extended) dimensions", () => {
    assert.deepEqual(readImageDims(WEBP_VP8X), {
      width: 1000,
      height: 800,
      mimeType: "image/webp",
    });
  });
});

describe("readImageDims — unrecognized input", () => {
  it("returns null for a buffer shorter than the 16-byte floor", () => {
    assert.equal(readImageDims(img("89504e47")), null);
  });

  it("returns null for bytes that match no known signature", () => {
    assert.equal(readImageDims(img("", 32)), null);
    assert.equal(readImageDims(img("123456789a", 32)), null);
  });
});

describe("readImageDims — truncated input must return null, never throw", () => {
  // Regression: each of these has valid magic bytes but a dimension field that
  // runs past the buffer end. Before the bounds guards, readUInt*BE/LE threw a
  // RangeError that escaped the upload handler as a 500 instead of a clean 400.

  it("PNG signature without a full IHDR", () => {
    // 20 bytes: height@20 (readUInt32BE) would read past the end.
    assert.equal(readImageDims(PNG.subarray(0, 20)), null);
  });

  it("JPEG whose SOF marker sits at the very end", () => {
    // APP0 (len 10) jumps the cursor to a SOF0 marker at byte 14 with no room
    // for its dimension bytes.
    const truncated = img("ffd8 ffe0 000a 0000000000000000 ffc0", 16);
    assert.equal(readImageDims(truncated), null);
  });

  it("WebP VP8 missing its height field", () => {
    assert.equal(readImageDims(WEBP_VP8.subarray(0, 29)), null);
  });

  it("WebP VP8X missing the last height byte", () => {
    assert.equal(readImageDims(WEBP_VP8X.subarray(0, 30)), null);
  });

  it("never throws for any prefix of a valid image", () => {
    // Property check: feeding progressively-truncated valid images must always
    // resolve to dims-or-null, never an exception.
    for (const full of [
      PNG,
      GIF,
      JPEG_WITH_APP0,
      WEBP_VP8,
      WEBP_VP8L,
      WEBP_VP8X,
    ]) {
      for (let len = 0; len <= full.length; len++) {
        assert.doesNotThrow(() => readImageDims(full.subarray(0, len)));
      }
    }
  });
});
