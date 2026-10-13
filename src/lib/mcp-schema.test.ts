import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mcpArgumentsError } from "./mcp-schema.ts";
import { MCP_TOOLS } from "./mcp.ts";

describe("MCP input contracts", () => {
  it("checks nested nullable types, bounds and distinct array values", () => {
    const schema = {
      type: "object",
      required: ["ids", "count"],
      properties: {
        ids: {
          type: "array",
          items: { type: "string", pattern: "^[a-z]+$" },
          maxItems: 2,
          uniqueItems: true,
        },
        count: { type: "integer", minimum: 1, maximum: 10 },
        note: { type: ["string", "null"], maxLength: 5 },
      },
      additionalProperties: false,
    };
    assert.equal(
      mcpArgumentsError(schema, { ids: ["a", "b"], count: 1, note: null }),
      null,
    );
    for (const value of [
      { ids: ["a", "a"], count: 1 },
      { ids: ["a", "b", "c"], count: 1 },
      { ids: ["../"], count: 1 },
      { ids: [], count: 0 },
      { ids: [], count: 1.5 },
      { ids: [], count: 11 },
      { ids: [], count: 1, note: "too long" },
      { ids: [], count: 1, unexpected: true },
      { count: 1 },
    ])
      assert.notEqual(mcpArgumentsError(schema, value), null);
  });

  it("enforces alternatives without coercing values", () => {
    const schema = {
      oneOf: [
        { type: "integer", minimum: 1 },
        { type: "string", enum: ["all"] },
      ],
    };
    assert.equal(mcpArgumentsError(schema, 3), null);
    assert.equal(mcpArgumentsError(schema, "all"), null);
    assert.notEqual(mcpArgumentsError(schema, "3"), null);
    assert.notEqual(mcpArgumentsError(schema, false), null);
  });

  it("has no unsupported validation keyword in published schemas", () => {
    const supported = new Set([
      "type",
      "description",
      "default",
      "enum",
      "const",
      "anyOf",
      "oneOf",
      "minimum",
      "maximum",
      "minLength",
      "maxLength",
      "pattern",
      "minItems",
      "maxItems",
      "uniqueItems",
      "items",
      "properties",
      "required",
      "additionalProperties",
    ]);
    function visit(schema: Record<string, unknown>) {
      for (const key of Object.keys(schema))
        assert.ok(supported.has(key), `Unsupported schema keyword: ${key}`);
      for (const child of Object.values(schema.properties ?? {}))
        visit(child as Record<string, unknown>);
      if (schema.items) visit(schema.items as Record<string, unknown>);
      for (const key of ["anyOf", "oneOf"])
        for (const child of (schema[key] ?? []) as Record<string, unknown>[])
          visit(child);
    }
    for (const tool of MCP_TOOLS) visit(tool.inputSchema);
  });
});
