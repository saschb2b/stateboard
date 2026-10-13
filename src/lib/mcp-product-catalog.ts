import type { McpToolDef } from "./mcp";
import { COMPONENT_KINDS } from "./release-types.ts";
import {
  idProperty,
  nullableTextProperty,
  objectSchema,
  productInput,
  referenceProperty,
  textProperty,
} from "./mcp-release-schema.ts";

const capabilityProperties = {
  name: {
    ...textProperty(),
    description: "Short user or business outcome name.",
  },
  outcome: {
    ...textProperty(2000),
    description:
      "What users can accomplish. Changing this versions the definition; existing assessments keep their pinned outcome.",
  },
  ownerLabel: textProperty(),
  ownerUserId: {
    ...nullableTextProperty(),
    description:
      "Optional current workspace member ID; use null for label-only ownership.",
  },
};
const componentProperties = {
  name: textProperty(),
  kind: { type: "string", enum: COMPONENT_KINDS },
  ownerLabel: textProperty(),
  ownerUserId: capabilityProperties.ownerUserId,
  description: textProperty(2000, 0),
  referenceUrl: referenceProperty,
};
const relationshipProperties = {
  relation: {
    ...textProperty(),
    description: "The concrete operation, event, job, or data supplied.",
  },
  required: {
    type: "boolean",
    default: true,
    description:
      "Whether this declared dependency is required; this does not create a readiness check.",
  },
  description: textProperty(2000, 0),
};
const capabilityComponentIds = {
  capabilityId: idProperty,
  componentId: idProperty,
};
const regionCapabilityIds = { regionId: idProperty, capabilityId: idProperty };

export const PRODUCT_MCP_TOOLS: McpToolDef[] = [
  {
    name: "get_product",
    description:
      "Read the product board with reusable capabilities, workspace components, declared dependencies, visual anchors, assessment IDs and current release overviews. Read before changing records to reuse existing identities and avoid duplicates.",
    requiredRole: "viewer",
    inputSchema: productInput({}),
  },
  {
    name: "create_capability",
    description:
      "Create one user/business capability on a product board. Returns updated product context. Read existing capabilities first; do not create one record per endpoint or file.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        data: objectSchema(capabilityProperties, [
          "name",
          "outcome",
          "ownerLabel",
        ]),
      },
      ["data"],
    ),
  },
  {
    name: "update_capability",
    description:
      "Update capability metadata or outcome. Supply the observed definitionRevision to detect conflicting definition edits. Outcome changes require explicit adoption in an assessment and new verification; old evidence is not carried over.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        capability_id: idProperty,
        data: objectSchema(
          {
            ...capabilityProperties,
            definitionRevision: {
              type: "integer",
              minimum: 1,
              maximum: 2147483647,
            },
          },
          ["definitionRevision"],
        ),
      },
      ["capability_id", "data"],
    ),
  },
  {
    name: "archive_capability",
    description:
      "Archive an obsolete capability without deleting retained assessments or evidence. Returns updated product context. Do not archive a capability to hide missing or failing verification.",
    requiredRole: "editor",
    inputSchema: productInput({ capability_id: idProperty }, ["capability_id"]),
  },
  {
    name: "create_component",
    description:
      "Create a reusable workspace implementation component through this product board. Read get_product first to reuse an existing component. Returns updated product context.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        data: objectSchema(componentProperties, ["name", "kind", "ownerLabel"]),
      },
      ["data"],
    ),
  },
  {
    name: "update_component",
    description:
      "Update a workspace component's descriptive metadata. References are stored without fetching them. Changes invalidate reviewed revisions of affected workspace assessments.",
    requiredRole: "editor",
    inputSchema: productInput(
      { component_id: idProperty, data: objectSchema(componentProperties) },
      ["component_id", "data"],
    ),
  },
  {
    name: "archive_component",
    description:
      "Archive an obsolete workspace component while preserving release history. Returns updated product context; refresh assessments before further writes.",
    requiredRole: "editor",
    inputSchema: productInput({ component_id: idProperty }, ["component_id"]),
  },
  {
    name: "link_capability_component",
    description:
      "Create or update one declared capability-to-component relationship. Repeating the same pair updates it. Explain the concrete dependency; a source-code relationship does not prove runtime readiness.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        data: objectSchema(
          { ...capabilityComponentIds, ...relationshipProperties },
          ["capabilityId", "componentId", "relation"],
        ),
      },
      ["data"],
    ),
  },
  {
    name: "unlink_capability_component",
    description:
      "Remove one declared capability-to-component relationship without deleting either entity. Returns updated product context.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        data: objectSchema(capabilityComponentIds, [
          "capabilityId",
          "componentId",
        ]),
      },
      ["data"],
    ),
  },
  {
    name: "create_dependency",
    description:
      "Declare that a consumer component needs an operation, event, job or data from a provider. The same consumer/provider/relation updates the existing edge. Cycles are permitted and do not imply runtime failure.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        data: objectSchema(
          {
            consumerId: idProperty,
            providerId: idProperty,
            ...relationshipProperties,
          },
          ["consumerId", "providerId", "relation"],
        ),
      },
      ["data"],
    ),
  },
  {
    name: "delete_dependency",
    description:
      "Remove one declared component dependency by its ID. Optional consumerId verifies that the edge belongs to the expected consumer. Returns updated product context.",
    requiredRole: "editor",
    inputSchema: productInput(
      {
        dependency_id: idProperty,
        data: objectSchema({ consumerId: idProperty }),
      },
      ["dependency_id"],
    ),
  },
  {
    name: "link_region_capability",
    description:
      "Link an existing screenshot region to a capability on the same product board. This optional visual anchor does not establish release readiness.",
    requiredRole: "editor",
    inputSchema: productInput(
      { data: objectSchema(regionCapabilityIds, ["regionId", "capabilityId"]) },
      ["data"],
    ),
  },
  {
    name: "unlink_region_capability",
    description:
      "Remove a screenshot region's link to a capability without deleting the region or capability.",
    requiredRole: "editor",
    inputSchema: productInput(
      { data: objectSchema(regionCapabilityIds, ["regionId", "capabilityId"]) },
      ["data"],
    ),
  },
];
