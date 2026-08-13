import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MCP_LATEST_VERSION,
  MCP_TOOLS,
  handleMcpMessage,
  type McpContext,
  type ToolOutcome,
} from "./mcp.ts";

const serverInfo = { name: "stateboard", version: "0.0.0-test" };

function ctx(
  callTool: McpContext["callTool"] = async () => ({
    content: [{ type: "text", text: "unused" }],
  }),
): McpContext {
  return { serverInfo, callTool };
}

const request = (method: string, params?: unknown, id: unknown = 1) => ({
  jsonrpc: "2.0",
  id,
  method,
  ...(params === undefined ? {} : { params }),
});

describe("handleMcpMessage: lifecycle", () => {
  it("echoes a known protocol version on initialize", async () => {
    const out = await handleMcpMessage(
      request("initialize", { protocolVersion: "2025-03-26" }),
      ctx(),
    );
    assert.equal(out.kind, "json");
    if (out.kind !== "json") return;
    const result = out.body.result as Record<string, unknown>;
    assert.equal(result.protocolVersion, "2025-03-26");
    assert.deepEqual(result.capabilities, { tools: {} });
    assert.deepEqual(result.serverInfo, serverInfo);
    assert.equal(typeof result.instructions, "string");
  });

  it("answers an unknown requested version with our latest", async () => {
    const out = await handleMcpMessage(
      request("initialize", { protocolVersion: "2099-01-01" }),
      ctx(),
    );
    if (out.kind !== "json") return assert.fail("expected json");
    const result = out.body.result as Record<string, unknown>;
    assert.equal(result.protocolVersion, MCP_LATEST_VERSION);
  });

  it("accepts notifications with a 202-style outcome", async () => {
    const out = await handleMcpMessage(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      ctx(),
    );
    assert.deepEqual(out, { kind: "accepted" });
  });

  it("answers ping with an empty result", async () => {
    const out = await handleMcpMessage(request("ping"), ctx());
    if (out.kind !== "json") return assert.fail("expected json");
    assert.deepEqual(out.body, { jsonrpc: "2.0", id: 1, result: {} });
  });

  it("rejects non-JSON-RPC messages", async () => {
    const out = await handleMcpMessage({ hello: "world" }, ctx());
    assert.equal(out.kind, "invalid");
    if (out.kind !== "invalid") return;
    const error = out.body.error as Record<string, unknown>;
    assert.equal(error.code, -32600);
  });

  it("rejects unknown methods with -32601, keeping the request id", async () => {
    const out = await handleMcpMessage(request("resources/list", {}, 7), ctx());
    if (out.kind !== "json") return assert.fail("expected json");
    assert.equal(out.body.id, 7);
    const error = out.body.error as Record<string, unknown>;
    assert.equal(error.code, -32601);
  });
});

describe("handleMcpMessage: tools", () => {
  it("lists every tool without leaking requiredRole", async () => {
    const out = await handleMcpMessage(request("tools/list"), ctx());
    if (out.kind !== "json") return assert.fail("expected json");
    const { tools } = out.body.result as {
      tools: Record<string, unknown>[];
    };
    assert.equal(tools.length, MCP_TOOLS.length);
    for (const tool of tools) {
      assert.equal(typeof tool.name, "string");
      assert.equal(typeof tool.description, "string");
      assert.equal(typeof tool.inputSchema, "object");
      assert.equal("requiredRole" in tool, false);
    }
  });

  it("dispatches tools/call with the given arguments", async () => {
    let seen: { name?: string; args?: Record<string, unknown> } = {};
    const out = await handleMcpMessage(
      request("tools/call", {
        name: "get_board",
        arguments: { board_id: "b1" },
      }),
      ctx(async (name, args) => {
        seen = { name, args };
        return { content: [{ type: "text", text: "ok" }] };
      }),
    );
    assert.deepEqual(seen, { name: "get_board", args: { board_id: "b1" } });
    if (out.kind !== "json") return assert.fail("expected json");
    assert.deepEqual(out.body.result, {
      content: [{ type: "text", text: "ok" }],
    });
  });

  it("rejects a tool name it has never heard of", async () => {
    const out = await handleMcpMessage(
      request("tools/call", { name: "drop_database", arguments: {} }),
      ctx(),
    );
    if (out.kind !== "json") return assert.fail("expected json");
    const error = out.body.error as Record<string, unknown>;
    assert.equal(error.code, -32602);
  });

  it("wraps a throwing tool into an isError result, not a crash", async () => {
    const out = await handleMcpMessage(
      request("tools/call", { name: "list_boards", arguments: {} }),
      ctx(async () => {
        throw new Error("db exploded");
      }),
    );
    if (out.kind !== "json") return assert.fail("expected json");
    const result = out.body.result as ToolOutcome;
    assert.equal(result.isError, true);
    // The thrown message must not leak.
    assert.equal(JSON.stringify(result).includes("db exploded"), false);
  });
});

describe("MCP_TOOLS definitions", () => {
  it("declares unique names and a required role for each tool", () => {
    const names = new Set(MCP_TOOLS.map((t) => t.name));
    assert.equal(names.size, MCP_TOOLS.length);
    for (const t of MCP_TOOLS) {
      assert.equal(["viewer", "editor", "owner"].includes(t.requiredRole), true);
      assert.equal(t.inputSchema.type, "object");
    }
  });

  it("write tools all require editor; read tools stay viewer", () => {
    const writers = MCP_TOOLS.filter((t) =>
      /^(create|update|delete)_/.test(t.name),
    );
    for (const t of writers) assert.equal(t.requiredRole, "editor");
    const readers = MCP_TOOLS.filter((t) => /^(list|get)_/.test(t.name));
    for (const t of readers) {
      // Share links govern public access, so listing them is editor-gated
      // like the REST route; everything else reads at viewer.
      const expected = t.name === "list_share_links" ? "editor" : "viewer";
      assert.equal(t.requiredRole, expected, t.name);
    }
  });
});
