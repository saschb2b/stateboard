import assert from "node:assert/strict";
import { it } from "node:test";
import { readMultipartBody } from "./read-multipart-body.ts";

it("bounds multipart bytes without trusting Content-Length", async () => {
  const request = new Request("https://board.example/upload", {
    method: "POST",
    body: "x".repeat(1024),
  });
  assert.equal(await readMultipartBody(request, 100), "too_large");
});

it("parses bounded multipart and rejects malformed data", async () => {
  const form = new FormData();
  form.set("label", "Rollback rehearsal");
  const parsed = await readMultipartBody(
    new Request("https://board.example/upload", { method: "POST", body: form }),
    1024,
  );
  assert.ok(parsed instanceof FormData);
  assert.equal(parsed.get("label"), "Rollback rehearsal");
  assert.equal(
    await readMultipartBody(
      new Request("https://board.example/upload", {
        method: "POST",
        body: "broken",
      }),
      1024,
    ),
    null,
  );
});
