import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { bearerApiKey, hashApiKey } from "@/lib/api-keys";
import { findMemberByApiKeyHash } from "@/lib/db";
import { handleMcpMessage } from "@/lib/mcp";
import { createMcpToolExecutor } from "@/lib/mcp-tools";
import { readJsonBody } from "@/lib/read-json-body";
import { minRole } from "@/lib/types";
import packageJson from "../../../../package.json";

/**
 * The MCP endpoint: a stateless Streamable HTTP server (see lib/mcp.ts).
 *
 * Auth is API-key only — an MCP client is never a browser, so there's no
 * cookie fallback. Configure a client with
 * `Authorization: Bearer sbk_…` (docs: /docs/agents).
 *
 * This handler speaks JSON-RPC, not the app's REST `{ error }` shape, so it
 * deliberately builds its NextResponses directly instead of via lib/http.ts:
 * protocol responses must be verbatim JSON-RPC objects.
 */

export async function POST(req: NextRequest) {
  const key = bearerApiKey(req.headers.get("authorization"));
  const principal = key
    ? await findMemberByApiKeyHash(hashApiKey(key))
    : null;
  if (!principal) {
    return NextResponse.json(
      { error: "A valid API key is required: Authorization: Bearer sbk_…" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  const member = {
    user: principal.user,
    workspaceId: principal.workspaceId,
    role: minRole(principal.keyRole, principal.memberRole),
  };

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: parsed.tooLarge ? "request body too large" : "parse error",
        },
      },
      { status: 400 },
    );
  }

  const outcome = await handleMcpMessage(parsed.value, {
    serverInfo: { name: "stateboard", version: packageJson.version },
    callTool: createMcpToolExecutor(member),
  });

  switch (outcome.kind) {
    case "json":
      return NextResponse.json(outcome.body);
    case "accepted":
      return new NextResponse(null, { status: 202 });
    case "invalid":
      return NextResponse.json(outcome.body, { status: 400 });
  }
}

// A stateless server offers no server-initiated stream and no sessions to
// delete; the spec's answer for both is 405.
const methodNotAllowed = () =>
  new NextResponse(null, { status: 405, headers: { Allow: "POST" } });

export function GET() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}
