import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readJsonBody, MAX_JSON_BYTES } from "./read-json-body.ts";

const post = (body: BodyInit, init: RequestInit = {}): Request =>
  new Request("http://t/", { method: "POST", body, ...init });

/** A streamed body with no Content-Length, to exercise the running byte cap. */
function streamed(text: string): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  // `duplex` is required for a streaming request body but isn't in the DOM
  // RequestInit type yet; the cast keeps strict TS happy.
  return new Request("http://t/", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
}

describe("readJsonBody", () => {
  it("parses a normal JSON object", async () => {
    const r = await readJsonBody(post(JSON.stringify({ name: "Acme", n: 3 })));
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, { name: "Acme", n: 3 });
  });

  it("accepts a payload just under the cap", async () => {
    const r = await readJsonBody(
      post(JSON.stringify({ s: "a".repeat(50) })),
      100,
    );
    assert.equal(r.ok, true);
  });

  it("rejects an over-cap body declared via Content-Length (fast path)", async () => {
    const r = await readJsonBody(post("x".repeat(200)), 100);
    assert.deepEqual(r, { ok: false, tooLarge: true });
  });

  it("rejects an over-cap streamed body with no Content-Length", async () => {
    const r = await readJsonBody(streamed("y".repeat(200)), 100);
    assert.deepEqual(r, { ok: false, tooLarge: true });
  });

  it("rejects unparseable JSON as a 400-shaped failure (not too-large)", async () => {
    const r = await readJsonBody(post("{ not valid json"));
    assert.deepEqual(r, { ok: false, tooLarge: false });
  });

  it("rejects non-object JSON (null, primitives, arrays)", async () => {
    for (const raw of ["null", "123", '"a string"', "true", "[1,2,3]"]) {
      const r = await readJsonBody(post(raw));
      assert.deepEqual(r, { ok: false, tooLarge: false }, raw);
    }
  });

  it("rejects an empty body", async () => {
    const r = await readJsonBody(post(""));
    assert.deepEqual(r, { ok: false, tooLarge: false });
  });

  it("defaults to a 1 MB cap", () => {
    assert.equal(MAX_JSON_BYTES, 1024 * 1024);
  });
});
