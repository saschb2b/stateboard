/**
 * Tiny pure-JS image-dimension reader for PNG, JPEG, GIF, WebP.
 *
 * We avoid pulling in `sharp` or `image-size` to keep the v0 docker image
 * small and easy to reason about. Only used during screenshot upload to
 * record intrinsic dimensions, so we can render absolute-positioned regions
 * with the correct aspect ratio.
 */

export interface ImageDims {
  width: number;
  height: number;
  mimeType: string;
}

export function readImageDims(buf: Buffer): ImageDims | null {
  if (buf.length < 16) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A, then IHDR at byte 16 with width@16, height@20
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
      mimeType: "image/png",
    };
  }

  // GIF: "GIF8", width LE@6, height LE@8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return {
      width: buf.readUInt16LE(6),
      height: buf.readUInt16LE(8),
      mimeType: "image/gif",
    };
  }

  // JPEG: starts with FF D8, walk segments looking for SOFn
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) return null;
      const marker = buf[offset + 1];
      if (marker === undefined) return null;
      offset += 2;
      // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC) hold dimensions
      const isSOF =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSOF) {
        return {
          height: buf.readUInt16BE(offset + 3),
          width: buf.readUInt16BE(offset + 5),
          mimeType: "image/jpeg",
        };
      }
      const segLen = buf.readUInt16BE(offset);
      offset += segLen;
    }
    return null;
  }

  // WebP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    const fourCC = buf.toString("ascii", 12, 16);
    if (fourCC === "VP8 ") {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
        mimeType: "image/webp",
      };
    }
    if (fourCC === "VP8L") {
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      if (
        b0 === undefined ||
        b1 === undefined ||
        b2 === undefined ||
        b3 === undefined
      ) {
        return null;
      }
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height, mimeType: "image/webp" };
    }
    if (fourCC === "VP8X") {
      const w = 1 + ((buf.readUInt32LE(24) & 0x00ffffff) >>> 0); // 24-bit LE
      const h = 1 + ((buf.readUInt32LE(27) & 0x00ffffff) >>> 0);
      return { width: w, height: h, mimeType: "image/webp" };
    }
  }

  return null;
}
