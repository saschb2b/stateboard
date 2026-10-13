import "server-only";
import { NextResponse } from "next/server";
import { requireReleaseApiMember, type ReleaseApiMember } from "./auth-helpers";
import { readProductContext, readReleaseWorkspace } from "./db";
import {
  badRequest,
  created,
  forbidden,
  conflict,
  notFound,
  noContent,
  ok,
  payloadTooLarge,
  serverError,
} from "./http";
import { readJsonBody } from "./read-json-body";
import { mutationIdError, parseExpectedRevision } from "./release-security";
import {
  ReleaseError,
  type ProductMutation,
  type ReleaseActor,
  type ReleaseMutation,
  type ReleaseWorkspace,
} from "./release-types";
import type { WorkspaceRole } from "./types";

export interface ReleaseRouteContext {
  params: Promise<{ id: string }>;
}
export interface ReleaseTokenContext {
  params: Promise<{ token: string }>;
}
interface ApiContext {
  member: ReleaseApiMember;
  actor: ReleaseActor;
  body: Record<string, unknown>;
}
interface ApiOptions {
  role?: WorkspaceRole;
  humanOnly?: boolean;
  readBody?: boolean;
  created?: boolean;
}

/** Centralizes bounded bodies and session/key policy; DB operations own validation/transactions. */
export async function releaseApi(
  request: Request,
  options: ApiOptions,
  action: (context: ApiContext) => Promise<unknown>,
): Promise<NextResponse> {
  try {
    const writes = request.method !== "GET" && request.method !== "HEAD";
    const member = await requireReleaseApiMember(
      request,
      options.role ?? (writes ? "editor" : "viewer"),
      options.humanOnly,
    );
    if (member instanceof NextResponse) return member;
    let body: Record<string, unknown> = {};
    if (writes && options.readBody !== false) {
      const parsed = await readJsonBody(request);
      if (!parsed.ok)
        return parsed.tooLarge
          ? payloadTooLarge()
          : badRequest("Expected a JSON object");
      body = parsed.value;
    }
    const actor: ReleaseActor = {
      userId: member.user.id,
      name: member.user.name?.trim() || member.user.email,
      credentialKind: member.credentialKind,
      credentialId: member.credentialId,
    };
    const result = await action({ member, actor, body });
    if (result instanceof NextResponse) return result;
    if (result === undefined) return noContent();
    return options.created
      ? created(result, { headers: { "cache-control": "no-store" } })
      : ok(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return releaseErrorResponse(error);
  }
}

export function releaseErrorResponse(error: unknown): NextResponse {
  if (error instanceof ReleaseError) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 403) return forbidden(error.message);
    if (error.status === 404) return notFound(error.message);
    return conflict(error.message);
  }
  console.error("Release request failed", error);
  return serverError("Could not complete the release request");
}

/** Legacy visual handlers preserve their behavior while new transactional errors stay HTTP errors. */
export function withReleaseErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return releaseErrorResponse(error);
    }
  };
}

export function expectedRevision(body: Record<string, unknown>): number {
  const revision = parseExpectedRevision(body.expectedRevision);
  if (revision === null)
    throw new ReleaseError(
      400,
      "expectedRevision must be a positive integer; refresh the assessment first",
    );
  return revision;
}

export async function productContext(boardId: string, workspaceId: string) {
  const product = await readProductContext(boardId, workspaceId);
  if (!product) throw new ReleaseError(404, "Product board not found");
  return product;
}

export async function releaseWorkspace(
  releaseId: string,
  workspaceId: string,
): Promise<ReleaseWorkspace> {
  const workspace = await readReleaseWorkspace(releaseId, workspaceId);
  if (!workspace) throw new ReleaseError(404, "Release assessment not found");
  return workspace;
}

const PRODUCT_ACTIONS = new Set([
  "capability.create",
  "capability.update",
  "capability.archive",
  "component.create",
  "component.update",
  "component.archive",
  "capability_component.put",
  "capability_component.delete",
  "dependency.create",
  "dependency.delete",
  "region_capability.put",
  "region_capability.delete",
]);
const RELEASE_ACTIONS = new Set([
  "scope.put",
  "check.create",
  "check.revise",
  "check.archive",
  "evidence.create",
]);

function mutationData(body: Record<string, unknown>): Record<string, unknown> {
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data))
    throw new ReleaseError(400, "data must be an object");
  return body.data as Record<string, unknown>;
}

export function productMutation(
  body: Record<string, unknown>,
): ProductMutation {
  if (typeof body.type !== "string" || !PRODUCT_ACTIONS.has(body.type))
    throw new ReleaseError(400, "Unknown product mutation");
  const idError = mutationIdError(body.type, body.id);
  if (idError) throw new ReleaseError(400, idError);
  return {
    type: body.type as ProductMutation["type"],
    ...(typeof body.id === "string" ? { id: body.id } : {}),
    data: mutationData(body),
  };
}

export function releaseMutation(
  body: Record<string, unknown>,
): ReleaseMutation {
  if (typeof body.type !== "string" || !RELEASE_ACTIONS.has(body.type))
    throw new ReleaseError(400, "Unknown release mutation");
  const idError = mutationIdError(body.type, body.id);
  if (idError) throw new ReleaseError(400, idError);
  return {
    type: body.type as ReleaseMutation["type"],
    ...(typeof body.id === "string" ? { id: body.id } : {}),
    expectedRevision: expectedRevision(body),
    data: mutationData(body),
  };
}
