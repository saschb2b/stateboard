import type { WorkspaceRole } from "./types";

/**
 * Minimal MCP (Model Context Protocol) server core — protocol layer only.
 *
 * StateBoard's MCP endpoint is a *stateless* Streamable HTTP server: every
 * JSON-RPC message arrives as its own POST and is answered with a single
 * JSON object. The spec explicitly permits this shape — `application/json`
 * responses instead of SSE, no `Mcp-Session-Id`, 405 on GET — and it's all
 * a tools-only server needs. Doing it by hand keeps the runtime free of an
 * SDK dependency, which matters for the airgap audience: this file plus
 * the route handler is the entire protocol surface to audit.
 *
 * Pure and free of `server-only`: the DB-backed tool implementations are
 * injected via {@link McpContext.callTool}, so this layer is unit-testable.
 */

/**
 * Spec revisions this server knows by name. Tools-only semantics are
 * identical across them; we echo a known requested version and otherwise
 * answer with our latest, per the negotiation rules — a client on a newer
 * revision is required to cope with a server on an older one.
 */
export const MCP_PROTOCOL_VERSIONS = [
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
] as const;

export const MCP_LATEST_VERSION = "2025-06-18";

export interface McpToolDef {
  name: string;
  description: string;
  /** Enforced by the executor; stripped from the wire format of tools/list. */
  requiredRole: WorkspaceRole;
  inputSchema: Record<string, unknown>;
}

const REGION_BOX_PROPS = {
  x: { type: "number", minimum: 0, maximum: 1 },
  y: { type: "number", minimum: 0, maximum: 1 },
  w: { type: "number", minimum: 0, maximum: 1 },
  h: { type: "number", minimum: 0, maximum: 1 },
} as const;

const STATE_PROP = {
  type: "string",
  enum: ["shipped", "mock", "missing"],
  description:
    "shipped = real and working, mock = looks real but is faked, missing = not built yet",
} as const;

/**
 * The tool surface. Deliberately mirrors the REST API's grain — boards,
 * regions, share links — and nothing else. Screens are readable through
 * get_board but not creatable here: adding one requires uploading image
 * bytes, which belongs to the REST uploads flow.
 */
export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "list_boards",
    description:
      "List every board in the workspace with per-state region counts (shipped / mock / missing). Start here to see what exists.",
    requiredRole: "viewer",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_board",
    description:
      "Fetch one board in full: every screen, every region with its rectangle (normalized [0,1] coordinates), state, label, and notes. This is the deep view of a board's status.",
    requiredRole: "viewer",
    inputSchema: {
      type: "object",
      properties: { board_id: { type: "string" } },
      required: ["board_id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_board",
    description:
      "Create a new board. Most teams keep one board per product or per quarterly review. A share link is minted automatically.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "e.g. 'Acme Dashboard / Q3 2026'",
        },
        description: {
          type: "string",
          description: "Appears beneath the name on the share link.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_board",
    description: "Rename a board or change its description.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: {
        board_id: { type: "string" },
        name: { type: "string" },
        description: { type: ["string", "null"] },
      },
      required: ["board_id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_region",
    description:
      "Draw a status rectangle on a screen. Coordinates are relative to the screenshot: x, y is the top-left corner and w, h the size, all in [0,1].",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: {
        screen_id: { type: "string" },
        ...REGION_BOX_PROPS,
        state: STATE_PROP,
        label: { type: "string" },
        notes: {
          type: "string",
          description: "Plaintext; shown on the share view.",
        },
      },
      required: ["screen_id", "x", "y", "w", "h", "state"],
      additionalProperties: false,
    },
  },
  {
    name: "update_region",
    description:
      "Change a region's state, rectangle, label, or notes. The common agent move — flipping a region from mock to shipped — is a one-field call.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: {
        region_id: { type: "string" },
        ...REGION_BOX_PROPS,
        state: STATE_PROP,
        label: { type: ["string", "null"] },
        notes: { type: ["string", "null"] },
      },
      required: ["region_id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_region",
    description: "Remove a region from its screen.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: { region_id: { type: "string" } },
      required: ["region_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_share_links",
    description:
      "List a board's share links, including revoked ones. A share link at /share/{token} is the no-login artifact stakeholders read.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: { board_id: { type: "string" } },
      required: ["board_id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_share_link",
    description:
      "Mint a new share link for a board — the thing to hand to a stakeholder after updating statuses.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: {
        board_id: { type: "string" },
        label: { type: "string", description: "e.g. 'exec review'" },
      },
      required: ["board_id"],
      additionalProperties: false,
    },
  },
];

export interface ToolContent {
  type: "text";
  text: string;
}

export interface ToolOutcome {
  content: ToolContent[];
  isError?: boolean;
}

export interface McpContext {
  serverInfo: { name: string; version: string };
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<ToolOutcome>;
}

/** How the transport should answer the POST that carried the message. */
export type McpOutcome =
  | { kind: "json"; body: Record<string, unknown> }
  /** Notification or client response — 202, no body. */
  | { kind: "accepted" }
  /** Not a usable JSON-RPC message — 400 with a JSON-RPC error, id null. */
  | { kind: "invalid"; body: Record<string, unknown> };

const rpcError = (
  id: unknown,
  code: number,
  message: string,
): Record<string, unknown> => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

const rpcResult = (id: unknown, result: unknown): Record<string, unknown> => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

/**
 * Dispatch one decoded JSON-RPC message. The transport (route handler) owns
 * HTTP concerns: auth, body parsing, and mapping McpOutcome to status codes.
 */
export async function handleMcpMessage(
  message: Record<string, unknown>,
  ctx: McpContext,
): Promise<McpOutcome> {
  if (message.jsonrpc !== "2.0") {
    return {
      kind: "invalid",
      body: rpcError(null, -32600, "expected a JSON-RPC 2.0 message"),
    };
  }

  // Notifications (no id) and client responses (result/error, no method)
  // just get acknowledged — a stateless server has nothing to do with them.
  const id = "id" in message ? message.id : undefined;
  const method = typeof message.method === "string" ? message.method : null;
  if (id === undefined || id === null || !method) {
    return { kind: "accepted" };
  }

  const params =
    typeof message.params === "object" && message.params !== null
      ? (message.params as Record<string, unknown>)
      : {};

  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      const protocolVersion =
        typeof requested === "string" &&
        (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
          ? requested
          : MCP_LATEST_VERSION;
      return {
        kind: "json",
        body: rpcResult(id, {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: ctx.serverInfo,
          instructions:
            "StateBoard tracks visual product status: boards hold screenshots " +
            "(screens), and rectangles on them (regions) carry one of three " +
            "states — shipped, mock, or missing. Use list_boards to orient, " +
            "get_board for the full picture, update_region to change status, " +
            "and create_share_link to produce the read-only link stakeholders " +
            "view.",
        }),
      };
    }
    case "ping":
      return { kind: "json", body: rpcResult(id, {}) };
    case "tools/list":
      return {
        kind: "json",
        body: rpcResult(id, {
          tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
          })),
        }),
      };
    case "tools/call": {
      const name = params.name;
      if (typeof name !== "string" || !MCP_TOOLS.some((t) => t.name === name)) {
        return {
          kind: "json",
          body: rpcError(id, -32602, `unknown tool: ${String(name)}`),
        };
      }
      const args =
        typeof params.arguments === "object" && params.arguments !== null
          ? (params.arguments as Record<string, unknown>)
          : {};
      try {
        return {
          kind: "json",
          body: rpcResult(id, await ctx.callTool(name, args)),
        };
      } catch {
        // Tool implementations report expected failures via isError results;
        // anything thrown is a genuine server fault. Don't leak internals.
        return {
          kind: "json",
          body: rpcResult(id, {
            content: [{ type: "text", text: "internal error running tool" }],
            isError: true,
          } satisfies ToolOutcome),
        };
      }
    }
    default:
      return {
        kind: "json",
        body: rpcError(id, -32601, `method not found: ${method}`),
      };
  }
}
