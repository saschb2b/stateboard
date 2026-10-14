import type { McpToolDef } from "./mcp";

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
    "shipped = verified working in production, mock = looks real but is faked, missing = not built yet; candidate readiness is separate",
} as const;

/**
 * The tool surface covers visual boards and release readiness. Screens are readable through
 * get_board but not creatable here: adding one requires uploading image
 * bytes, which belongs to the REST uploads flow.
 */
export const VISUAL_MCP_TOOLS: McpToolDef[] = [
  {
    name: "list_boards",
    description:
      "List every board with visual region counts and latest release readiness, gap/blocker counts and decision context. Start here, then get_product for capabilities and dependencies.",
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
      "Fetch a board's visual view: every screen and region with normalized [0,1] rectangles, visual states, labels and notes. Use get_product and get_release for capabilities, architecture and release evidence.",
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
      "Create one board for a product. Reuse it across releases and create candidate reviews with create_release. A visual share link is minted automatically.",
    requiredRole: "editor",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Stable product name, without a release version or review date.",
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
