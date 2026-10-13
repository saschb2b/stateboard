import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clientRequest } from "./client-request.ts";

describe("client requests", () => {
  it("reports a connection failure without treating it as a saved mutation", async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await assert.rejects(
      clientRequest("/api/regions/one", { method: "PATCH" }),
      /Could not reach StateBoard/,
    );
  });
  it("preserves the server validation message", async (t) => {
    t.mock.method(globalThis, "fetch", async () =>
      Response.json(
        { error: "Assessment changed. Reload first." },
        { status: 409 },
      ),
    );
    await assert.rejects(
      clientRequest("/api/releases/one"),
      /Assessment changed. Reload first./,
    );
  });
  it("accepts empty delete responses", async (t) => {
    t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(null, { status: 204 }),
    );
    assert.equal(
      await clientRequest("/api/regions/one", { method: "DELETE" }),
      null,
    );
  });
  it("rejects unreadable successful responses before callers use missing fields", async (t) => {
    t.mock.method(
      globalThis,
      "fetch",
      async () => new Response("<html>Gateway error</html>"),
    );
    await assert.rejects(
      clientRequest("/api/regions/one"),
      /unreadable response/,
    );
  });
});
