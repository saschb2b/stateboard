import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createWorkspaceDrafts,
  createWorkspaceRefresh,
} from "./workspace-refresh.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((pass, fail) => {
    resolve = pass;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("workspace refresh", () => {
  it("invalidates a pending read when editing starts, including after editing closes", async () => {
    const sync = createWorkspaceRefresh();
    const drafts = createWorkspaceDrafts();
    const response = deferred<string>();
    const received: string[] = [];
    const unsubscribe = drafts.subscribe(() => sync.invalidateReads());
    const oldRead = sync.read(
      () => response.promise,
      (value) => received.push(value),
    );
    const closeFirst = drafts.register();
    const closeSecond = drafts.register();
    closeFirst();
    assert.equal(drafts.hasDrafts(), true);
    closeSecond();
    assert.equal(drafts.hasDrafts(), false);
    await sync.read(
      () => Promise.resolve("after editing"),
      (value) => received.push(value),
    );
    response.resolve("before editing");
    await oldRead;
    assert.deepEqual(received, ["after editing"]);
    unsubscribe();
  });
  it("coalesces focus and interval reads", async () => {
    const sync = createWorkspaceRefresh();
    const response = deferred<string>();
    const received: string[] = [];
    const first = sync.read(
      () => response.promise,
      (value) => received.push(value),
    );
    assert.equal(
      sync.read(
        () => Promise.resolve("duplicate"),
        () => {},
      ),
      null,
    );
    response.resolve("current");
    await first;
    assert.deepEqual(received, ["current"]);
  });

  it("keeps a delayed read from replacing a completed write", async () => {
    const sync = createWorkspaceRefresh();
    const response = deferred<string>();
    const received: string[] = [];
    const receive = (value: string) => received.push(value);
    const oldRead = sync.read(() => response.promise, receive);
    await sync.write(() => Promise.resolve("saved"), receive);
    await sync.read(() => Promise.resolve("newer external update"), receive);
    response.resolve("outdated");
    await oldRead;
    assert.deepEqual(received, ["saved", "newer external update"]);
  });

  it("pauses reads through queued writes and resumes after a failure", async () => {
    const sync = createWorkspaceRefresh();
    const firstResponse = deferred<string>();
    const received: string[] = [];
    const started: string[] = [];
    const receive = (value: string) => received.push(value);
    const first = sync.write(() => {
      started.push("first");
      return firstResponse.promise;
    }, receive);
    const second = sync.write(async () => {
      started.push("second");
      throw new Error("write rejected");
    }, receive);
    const rejected = assert.rejects(second, /write rejected/);
    await Promise.resolve();
    assert.deepEqual(started, ["first"]);
    assert.equal(
      sync.read(() => Promise.resolve("stale"), receive),
      null,
    );
    firstResponse.resolve("saved");
    await first;
    await rejected;
    await sync.read(() => Promise.resolve("refreshed"), receive);
    assert.deepEqual(started, ["first", "second"]);
    assert.deepEqual(received, ["saved", "refreshed"]);
  });

  it("ignores obsolete read failures but reports the current failure", async () => {
    const sync = createWorkspaceRefresh();
    const response = deferred<string>();
    const oldRead = sync.read(
      () => response.promise,
      () => {},
    );
    await sync.write(
      () => Promise.resolve("saved"),
      () => {},
    );
    response.reject(new Error("obsolete failure"));
    await oldRead;
    await assert.rejects(
      sync.read(
        () => Promise.reject(new Error("current failure")),
        () => {},
      )!,
      /current failure/,
    );
  });

  it("ignores reads and writes from a previous mounted lifecycle", async () => {
    const sync = createWorkspaceRefresh();
    const response = deferred<string>();
    const writeResponse = deferred<string>();
    const received: string[] = [];
    const receive = (value: string) => received.push(value);
    const read = sync.read(() => response.promise, receive);
    const write = sync.write(() => writeResponse.promise, receive);
    sync.deactivate();
    sync.activate();
    response.resolve("old read");
    writeResponse.resolve("old write");
    await Promise.all([read, write]);
    await sync.read(() => Promise.resolve("current lifecycle"), receive);
    assert.deepEqual(received, ["current lifecycle"]);
  });
});
