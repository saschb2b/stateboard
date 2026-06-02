/**
 * Read and JSON-parse a request body with a hard byte cap.
 *
 * `req.json()` buffers the whole body into memory with no ceiling, so a hostile
 * (authenticated) client could spike memory by POSTing a huge payload. None of
 * our routes accept anything large — uploads go through multipart, not JSON —
 * so we cap JSON bodies well above any legitimate request and reject the rest.
 *
 * The cap is enforced two ways: a fast reject on a declared oversize
 * Content-Length, and a running byte count while draining the stream (so a
 * spoofed/absent length or chunked encoding can't slip past). The parsed value
 * must be a non-null object — every handler expects `{ ... }` and several do
 * `"field" in body`, which throws on a primitive; rejecting non-objects here
 * turns that latent 500 into a clean 400. Never throws.
 */

/** 1 MB — orders of magnitude above our largest real payload (a ~10 KB note). */
export const MAX_JSON_BYTES = 1024 * 1024;

export type JsonBodyResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; tooLarge: boolean };

export async function readJsonBody(
  req: Request,
  max: number = MAX_JSON_BYTES,
): Promise<JsonBodyResult> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) {
    return { ok: false, tooLarge: true };
  }

  const body = req.body;
  if (!body) return { ok: false, tooLarge: false };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    const text = new TextDecoder().decode(buf);
    if (text.trim() === "") return { ok: false, tooLarge: false };
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, tooLarge: false };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, tooLarge: false };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}
