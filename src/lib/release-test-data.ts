import type {
  ProductContext,
  ReleaseDetail,
  ReleaseEvidence,
  ReleaseDecision,
} from "./release-types";
import { evaluateRelease } from "./readiness.ts";

export const TEST_NOW = 1_000_000;
export function evidenceRecord(
  patch: Partial<ReleaseEvidence> = {},
): ReleaseEvidence {
  return {
    id: "e1",
    sequence: 1,
    assessmentId: "release1",
    checkId: "check1",
    checkRevision: 1,
    candidateRef: "sha256:immutable-build",
    environment: "staging",
    audience: "finance",
    configurationRef: "config1",
    result: "pass",
    summary: "Correct document received",
    source: "CI",
    runRef: "run1",
    eventId: "event1",
    observedAt: TEST_NOW - 1000,
    receivedAt: TEST_NOW,
    actorId: "alice",
    actorName: "Alice",
    credentialKind: "api_key",
    referenceUrl: "https://internal.example/results",
    ...patch,
  };
}
export function releaseFixture(): ReleaseDetail {
  return {
    assessment: {
      id: "release1",
      boardId: "board1",
      candidateLabel: "RC 1",
      candidateRef: "sha256:immutable-build",
      validationEnvironment: "staging",
      targetEnvironment: "production",
      audience: "finance",
      configurationRef: "config1",
      ownerLabel: "Release team",
      revision: 1,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    },
    scope: [
      {
        assessmentId: "release1",
        capabilityId: "cap1",
        name: "Export invoice",
        outcome: "Receive a PDF",
        definitionRevision: 1,
        ownerLabel: "Documents",
        included: true,
        scopeReason: "Critical finance workflow",
      },
    ],
    checks: [
      {
        id: "check1",
        assessmentId: "release1",
        subjectType: "capability",
        subjectId: "cap1",
        revision: 1,
        claim: "Authorized user receives a valid PDF",
        category: "functional",
        required: true,
        ownerLabel: "Documents",
        method: "End-to-end test",
        environment: "staging",
        maxAgeMs: 24 * 3600_000,
        archivedAt: null,
      },
    ],
    evidence: [evidenceRecord()],
    decisions: [],
    shares: [],
    assets: [],
  };
}
export function productFixture(): ProductContext {
  return {
    board: {
      id: "board1",
      workspaceId: "default",
      name: "Billing",
      description: null,
      createdBy: "alice",
      updatedBy: "alice",
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    },
    capabilities: [
      {
        id: "cap1",
        boardId: "board1",
        name: "Export invoice",
        outcome: "Receive a PDF",
        definitionRevision: 1,
        ownerLabel: "Documents",
        ownerUserId: null,
        archivedAt: null,
        createdAt: TEST_NOW,
        updatedAt: TEST_NOW,
      },
    ],
    components: ["api", "queue", "worker"].map((id) => ({
      id,
      workspaceId: "default",
      name: id,
      kind: "service",
      ownerLabel: "Documents",
      ownerUserId: null,
      description: "",
      referenceUrl: null,
      archivedAt: null,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    })),
    capabilityComponents: [
      {
        capabilityId: "cap1",
        componentId: "api",
        relation: "calls",
        required: true,
        description: "Export request",
      },
    ],
    dependencies: [
      {
        id: "d1",
        consumerId: "api",
        providerId: "queue",
        relation: "publishes",
        required: true,
        description: "Request job",
      },
      {
        id: "d2",
        consumerId: "queue",
        providerId: "worker",
        relation: "consumed by",
        required: true,
        description: "Generate PDF",
      },
      {
        id: "d3",
        consumerId: "worker",
        providerId: "api",
        relation: "calls",
        required: false,
        description: "Cycle",
      },
    ],
    regionCapabilities: [],
    screens: [],
    releases: [],
  };
}
export function decisionFixture(): ReleaseDecision {
  const detail = releaseFixture();
  const product = productFixture();
  return {
    id: "decision1",
    assessmentId: "release1",
    revision: 1,
    decision: "approved",
    rationale: "Verified all required claims",
    actorId: "alice",
    actorName: "Alice private identity",
    createdAt: TEST_NOW,
    expiresAt: TEST_NOW + 1000,
    snapshot: {
      assessment: detail.assessment,
      scope: detail.scope,
      checks: detail.checks,
      evidence: detail.evidence,
      readiness: evaluateRelease(detail, TEST_NOW),
      components: product.components,
      capabilityComponents: product.capabilityComponents,
      dependencies: product.dependencies,
      regionCapabilities: product.regionCapabilities,
      screens: [],
      assets: [],
    },
  };
}
