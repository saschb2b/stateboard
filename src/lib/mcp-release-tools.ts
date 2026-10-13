import "server-only";
import type { ReleaseApiMember } from "./auth-helpers";
import {
  createReleaseAssessment,
  mutateProduct,
  mutateRelease,
  readProductContext,
  readReleaseCheckHistory,
  readReleaseWorkspace,
} from "./db";
import type { ToolOutcome } from "./mcp";
import { buildAgentReadiness } from "./release-agent-summary";
import { parseExpectedRevision } from "./release-security";
import {
  ReleaseError,
  type CreateAssessmentInput,
  type ProductMutationType,
  type ReleaseActor,
  type ReleaseMutationType,
  type ReleaseWorkspace,
} from "./release-types";

/** These adapters share the REST transaction boundary, including live key revocation. */
type ReleaseTool = (
  member: ReleaseApiMember,
  args: Record<string, unknown>,
) => Promise<ToolOutcome>;

const result = (data: unknown): ToolOutcome => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  structuredContent: { data },
});

function actor(member: ReleaseApiMember): ReleaseActor {
  return {
    userId: member.user.id,
    name: member.user.name?.trim() || member.user.email,
    credentialKind: member.credentialKind,
    credentialId: member.credentialId,
  };
}
function identifier(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(value))
    throw new ReleaseError(400, `${key} must be a valid resource ID`);
  return value;
}
function data(args: Record<string, unknown>): Record<string, unknown> {
  if (!args.data || typeof args.data !== "object" || Array.isArray(args.data))
    throw new ReleaseError(400, "data must be an object");
  return args.data as Record<string, unknown>;
}
function expectedRevision(args: Record<string, unknown>): number {
  const revision = parseExpectedRevision(args.expected_revision);
  if (revision === null)
    throw new ReleaseError(
      400,
      "expected_revision must be a positive integer; refresh the assessment first",
    );
  return revision;
}
async function workspace(
  member: ReleaseApiMember,
  releaseId: string,
): Promise<ReleaseWorkspace> {
  const found = await readReleaseWorkspace(releaseId, member.workspaceId);
  if (!found) throw new ReleaseError(404, "Release assessment not found");
  return found;
}

function productMutation(
  type: ProductMutationType,
  idKey?: string,
  requiresData = true,
): ReleaseTool {
  return async (member, args) =>
    result(
      await mutateProduct(
        member.workspaceId,
        identifier(args, "board_id"),
        {
          type,
          ...(idKey ? { id: identifier(args, idKey) } : {}),
          data: requiresData || args.data !== undefined ? data(args) : {},
        },
        actor(member),
      ),
    );
}
function releaseMutation(
  type: ReleaseMutationType,
  idKey?: string,
  requiresData = true,
): ReleaseTool {
  return async (member, args) => {
    const releaseId = identifier(args, "release_id");
    await mutateRelease(
      member.workspaceId,
      releaseId,
      {
        type,
        ...(idKey ? { id: identifier(args, idKey) } : {}),
        expectedRevision: expectedRevision(args),
        data: requiresData ? data(args) : {},
      },
      actor(member),
    );
    // The follow-up snapshot contains its own current revision, including concurrent edits.
    return result(await workspace(member, releaseId));
  };
}

export const releaseMcpTools: Record<string, ReleaseTool> = {
  async get_product(member, args) {
    const product = await readProductContext(
      identifier(args, "board_id"),
      member.workspaceId,
    );
    if (!product) throw new ReleaseError(404, "Product board not found");
    return result(product);
  },
  async get_release(member, args) {
    return result(await workspace(member, identifier(args, "release_id")));
  },
  async get_release_readiness(member, args) {
    return result(
      buildAgentReadiness(
        await workspace(member, identifier(args, "release_id")),
      ),
    );
  },
  async get_check_history(member, args) {
    return result(
      await readReleaseCheckHistory(
        member.workspaceId,
        identifier(args, "release_id"),
        identifier(args, "check_id"),
      ),
    );
  },
  create_capability: productMutation("capability.create"),
  update_capability: productMutation("capability.update", "capability_id"),
  archive_capability: productMutation(
    "capability.archive",
    "capability_id",
    false,
  ),
  create_component: productMutation("component.create"),
  update_component: productMutation("component.update", "component_id"),
  archive_component: productMutation(
    "component.archive",
    "component_id",
    false,
  ),
  link_capability_component: productMutation("capability_component.put"),
  unlink_capability_component: productMutation("capability_component.delete"),
  create_dependency: productMutation("dependency.create"),
  delete_dependency: productMutation(
    "dependency.delete",
    "dependency_id",
    false,
  ),
  link_region_capability: productMutation("region_capability.put"),
  unlink_region_capability: productMutation("region_capability.delete"),
  async create_release(member, args) {
    // createReleaseAssessment validates every input field and relationship transactionally.
    const detail = await createReleaseAssessment(
      member.workspaceId,
      identifier(args, "board_id"),
      data(args) as unknown as CreateAssessmentInput,
      actor(member),
    );
    return result(await workspace(member, detail.assessment.id));
  },
  set_release_scope: releaseMutation("scope.put"),
  create_check: releaseMutation("check.create"),
  revise_check: releaseMutation("check.revise", "check_id"),
  archive_check: releaseMutation("check.archive", "check_id", false),
  submit_evidence: releaseMutation("evidence.create"),
};
