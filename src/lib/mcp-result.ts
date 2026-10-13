import type { ToolOutcome } from "./mcp.ts";

export type McpErrorCode =
  | "validation_error"
  | "not_found"
  | "forbidden"
  | "conflict"
  | "internal_error";

export function mcpFailure(
  code: McpErrorCode,
  message: string,
  status?: number,
): ToolOutcome {
  const structuredContent = {
    error: { code, message, ...(status ? { status } : {}) },
  };
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: true,
  };
}
