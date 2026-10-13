import type { McpToolDef } from "./mcp";
import { PRODUCT_MCP_TOOLS } from "./mcp-product-catalog.ts";
import { CHECK_CATEGORIES } from "./release-types.ts";
import {
  idProperty,
  nullableTextProperty,
  objectSchema,
  productInput,
  referenceProperty,
  releaseInput,
  textProperty,
} from "./mcp-release-schema.ts";

const checkDefinitionProperties = {
  claim: {
    ...textProperty(2000),
    description:
      "One observable behavior or acceptance claim; avoid treating code existence as working behavior.",
  },
  category: { type: "string", enum: CHECK_CATEGORIES, default: "functional" },
  required: {
    type: "boolean",
    default: true,
    description:
      "Required checks gate readiness. Never weaken a gate simply to turn readiness green.",
  },
  ownerLabel: {
    ...textProperty(),
    description:
      "Accountable owner; defaults to the assessment owner when creating a check.",
  },
  method: {
    ...textProperty(1000),
    description: "How this specific claim is verified; defaults to manual.",
  },
  environment: {
    ...textProperty(),
    description:
      "Must equal the assessment validationEnvironment or targetEnvironment; defaults to validationEnvironment.",
  },
  maxAgeMs: {
    type: "integer",
    minimum: 1,
    maximum: 366 * 86400000,
    default: 86400000,
    description: "Evidence freshness window in milliseconds from observedAt.",
  },
};

export const RELEASE_MCP_TOOLS: McpToolDef[] = [
  ...PRODUCT_MCP_TOOLS,
  {
    name: "get_release",
    description:
      "Read a complete assessment: immutable candidate context, current assessment revision, scoped capabilities, versioned checks, append-only evidence, product wiring and calculated readiness. Refresh this before release writes and after revision conflicts.",
    requiredRole: "viewer",
    inputSchema: objectSchema({ release_id: idProperty }, ["release_id"]),
  },
  {
    name: "get_release_readiness",
    description:
      "Read the current readiness verdict with actionable failed/missing/expired/inconclusive check definitions, capabilities missing required acceptance checks, and the latest human decision with whether it is current. Readiness is not deployment or approval.",
    requiredRole: "viewer",
    inputSchema: objectSchema({ release_id: idProperty }, ["release_id"]),
  },
  {
    name: "get_check_history",
    description:
      "Read one assessment check's current definition, retained definition revisions and all its evidence. Use this to explain a failure or stale evidence, not to select an older passing result over a newer failure.",
    requiredRole: "viewer",
    inputSchema: objectSchema(
      { release_id: idProperty, check_id: idProperty },
      ["release_id", "check_id"],
    ),
  },
  {
    name: "create_release",
    description:
      "Create an assessment for one immutable candidate/environment/audience/configuration tuple and existing capability IDs. Read existing assessments first to avoid duplicates. A changed tuple needs a new assessment and new evidence. Returns a full workspace with revision and readiness.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        data: objectSchema(
          {
            candidateLabel: textProperty(),
            candidateRef: {
              ...textProperty(4000),
              description:
                "Immutable artifact, commit SHA, image digest or pinned manifest; never main, HEAD or latest.",
            },
            validationEnvironment: textProperty(),
            targetEnvironment: textProperty(),
            audience: textProperty(1000),
            configurationRef: {
              ...textProperty(4000),
              description:
                "Pinned configuration identifier, not credentials or secret contents.",
            },
            ownerLabel: textProperty(),
            capabilityIds: {
              type: "array",
              items: idProperty,
              maxItems: 500,
              uniqueItems: true,
            },
          },
          [
            "candidateLabel",
            "candidateRef",
            "validationEnvironment",
            "targetEnvironment",
            "audience",
            "configurationRef",
            "ownerLabel",
            "capabilityIds",
          ],
        ),
      },
      ["data"],
    ),
  },
  {
    name: "set_release_scope",
    description:
      "Include or exclude one product capability in an assessment, or explicitly adopt its latest outcome definition. Exclusion requires a reason and archives its checks. Adopting a changed definition versions its checks and requires new evidence. Returns the current workspace and revision.",
    requiredRole: "editor",
    inputSchema: releaseInput(
      {
        data: objectSchema(
          {
            capabilityId: idProperty,
            included: { type: "boolean", default: true },
            adoptLatest: { type: "boolean", default: false },
            scopeReason: {
              ...textProperty(2000, 0),
              description:
                "Required, nonempty rationale when included is false.",
            },
          },
          ["capabilityId"],
        ),
      },
      ["data"],
    ),
  },
  {
    name: "create_check",
    description:
      "Define a versioned check on an included capability, its related component, or the whole release. Each included capability needs its own required functional acceptance check. Component checks and visual status cannot substitute for that claim. Returns the updated workspace.",
    requiredRole: "editor",
    inputSchema: releaseInput(
      {
        data: objectSchema(
          {
            subjectType: {
              type: "string",
              enum: ["capability", "component", "release"],
            },
            subjectId: {
              ...nullableTextProperty(),
              description:
                "Included capability ID or related component ID. Omit or null for a release-wide check.",
            },
            ...checkDefinitionProperties,
          },
          ["subjectType", "claim"],
        ),
      },
      ["data"],
    ),
  },
  {
    name: "revise_check",
    description:
      "Create a new revision of an active check definition. Its subject is immutable, and prior evidence cannot verify the new revision. Omitted definition fields retain their values. Returns the updated workspace and assessment revision.",
    requiredRole: "editor",
    inputSchema: releaseInput(
      { check_id: idProperty, data: objectSchema(checkDefinitionProperties) },
      ["check_id", "data"],
    ),
  },
  {
    name: "archive_check",
    description:
      "Archive an obsolete check without deleting its definitions or evidence. Do not archive a failing required claim to hide a blocker. Returns the updated workspace and assessment revision.",
    requiredRole: "editor",
    inputSchema: releaseInput({ check_id: idProperty }, ["check_id"]),
  },
  {
    name: "submit_evidence",
    description:
      "Append an actually observed result for the exact current check revision and candidate context. source + eventId identifies one producer event; retry the identical payload with the same eventId safely after an uncertain response. A different observation needs a new eventId. observedAt is verification time, never ingestion time. Returns the updated workspace; this does not approve or publish a release.",
    requiredRole: "editor",
    inputSchema: releaseInput(
      {
        data: objectSchema(
          {
            checkId: idProperty,
            checkRevision: { type: "integer", minimum: 1, maximum: 2147483647 },
            candidateRef: textProperty(4000),
            environment: {
              ...textProperty(),
              description: "Must match this check's environment.",
            },
            audience: textProperty(1000),
            configurationRef: textProperty(4000),
            result: { type: "string", enum: ["pass", "fail", "inconclusive"] },
            summary: {
              ...textProperty(10000),
              description:
                "What was observed, coverage and relevant limits. Use inconclusive when the claim was not established.",
            },
            source: {
              ...textProperty(),
              description:
                "Stable producer name, for example release-ci or smoke-runner.",
            },
            runRef: {
              ...textProperty(1000),
              description: "Traceable run or execution identifier.",
            },
            eventId: {
              ...textProperty(1000),
              description:
                "Stable unique event within source and assessment. Reuse only for an identical retry.",
            },
            observedAt: {
              type: "integer",
              minimum: 1,
              maximum: Number.MAX_SAFE_INTEGER,
              description:
                "Unix epoch milliseconds when verification occurred; cannot be in the future.",
            },
            referenceUrl: referenceProperty,
          },
          [
            "checkId",
            "checkRevision",
            "candidateRef",
            "environment",
            "audience",
            "configurationRef",
            "result",
            "summary",
            "source",
            "runRef",
            "eventId",
            "observedAt",
          ],
        ),
      },
      ["data"],
    ),
  },
];
