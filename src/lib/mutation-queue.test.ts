import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMutationQueue } from "./mutation-queue.ts";

describe("resource write queue", () => {
  it("orders writes to one resource while another resource can proceed", async () => {
    const enqueue = createMutationQueue();
    const first = Promise.withResolvers<string>();
    const started: string[] = [];
    const text = enqueue("region-a", async () => {
      started.push("text");
      return first.promise;
    });
    const state = enqueue("region-a", async () => {
      started.push("state");
      return "missing";
    });
    const other = enqueue("region-b", async () => {
      started.push("other");
      return "mock";
    });
    assert.equal(await other, "mock");
    assert.deepEqual(started, ["text", "other"]);
    first.resolve("New label");
    assert.equal(await text, "New label");
    assert.equal(await state, "missing");
    assert.deepEqual(started, ["text", "other", "state"]);
  });

  it("reports a failed write and allows the next write to run", async () => {
    const enqueue = createMutationQueue();
    const failed = enqueue("region", async () => {
      throw new Error("offline");
    });
    const retry = enqueue("region", async () => "saved");
    await assert.rejects(failed, /offline/);
    assert.equal(await retry, "saved");
  });
});
