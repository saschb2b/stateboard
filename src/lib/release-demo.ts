import { getDemoBoard } from "./demo-data";
import { evaluateRelease } from "./readiness";
import type {
  Capability,
  ProductComponent,
  ProductContext,
  ReleaseAssessment,
  ReleaseCheck,
  ReleaseDetail,
  ReleaseEvidence,
} from "./release-types";

/** Permanent, database-free example. Its clock is fixed so the cases stay teachable. */
export const RELEASE_DEMO_NOW = Date.parse("2026-10-13T10:00:00Z");
const HOUR = 3_600_000;
export function getReleaseDemo() {
  const { board, screens } = getDemoBoard();
  const now = RELEASE_DEMO_NOW;
  const capability = (
    id: string,
    name: string,
    outcome: string,
    ownerLabel: string,
  ): Capability => ({
    id,
    boardId: board.id,
    name,
    outcome,
    ownerLabel,
    ownerUserId: null,
    definitionRevision: 1,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const capabilities = [
    capability(
      "cap-export",
      "Export an invoice",
      "A customer downloads a complete invoice CSV.",
      "Frontend + billing",
    ),
    capability(
      "cap-webhook",
      "Receive a partner webhook",
      "An event is stored once and acknowledged without a UI.",
      "Integrations team",
    ),
    capability(
      "cap-recover",
      "Recover an account",
      "A user regains access using a valid recovery link.",
      "Identity team",
    ),
    capability(
      "cap-reconcile",
      "Reconcile transactions overnight",
      "The overnight worker reconciles every transaction and reports failures.",
      "Data operations",
    ),
    capability(
      "cap-search",
      "Search invoices",
      "A user finds invoices for their own account.",
      "Billing team",
    ),
  ];
  const component = (
    id: string,
    name: string,
    kind: ProductComponent["kind"],
    ownerLabel: string,
  ): ProductComponent => ({
    id,
    workspaceId: "default",
    name,
    kind,
    ownerLabel,
    ownerUserId: null,
    description: `${name} supports the assessed product capabilities.`,
    referenceUrl: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const components = [
    component("cmp-billing", "Billing API", "api", "Billing team"),
    component("cmp-events", "Partner event", "event", "Integrations team"),
    component("cmp-worker", "Event worker", "worker", "Integrations team"),
    component("cmp-identity", "Identity service", "service", "Identity team"),
    component("cmp-db", "Ledger store", "datastore", "Data operations"),
  ];
  const assessment: ReleaseAssessment = {
    id: "release-example",
    boardId: board.id,
    candidateLabel: "October release · RC 3",
    candidateRef: "sha256:demo-rc3-immutable",
    validationEnvironment: "staging-eu",
    targetEnvironment: "production-eu",
    audience: "Existing business accounts",
    configurationRef: "flags:invoice-export-v3",
    ownerLabel: "Release owner",
    revision: 1,
    createdAt: now - HOUR,
    updatedAt: now,
  };
  const product: ProductContext = {
    board,
    screens,
    capabilities,
    components,
    releases: [assessment],
    capabilityComponents: [
      {
        capabilityId: "cap-export",
        componentId: "cmp-billing",
        relation: "calls",
        required: true,
        description: "GET /invoices/:id/export",
      },
      {
        capabilityId: "cap-webhook",
        componentId: "cmp-worker",
        relation: "requires",
        required: true,
        description: "Processes incoming events exactly once.",
      },
      {
        capabilityId: "cap-recover",
        componentId: "cmp-identity",
        relation: "calls",
        required: true,
        description: "Recovery token validation.",
      },
      {
        capabilityId: "cap-reconcile",
        componentId: "cmp-db",
        relation: "requires",
        required: true,
        description: "Transaction consistency.",
      },
      {
        capabilityId: "cap-search",
        componentId: "cmp-billing",
        relation: "calls",
        required: true,
        description: "Scoped invoice search.",
      },
    ],
    dependencies: [
      {
        id: "dep-event",
        consumerId: "cmp-worker",
        providerId: "cmp-events",
        relation: "consumes",
        required: true,
        description: "Partner invoice.created event.",
      },
      {
        id: "dep-ledger",
        consumerId: "cmp-billing",
        providerId: "cmp-db",
        relation: "reads",
        required: true,
        description: "Uses the ledger projection.",
      },
    ],
    regionCapabilities: screens[0]?.regions[0]
      ? [{ regionId: screens[0].regions[0].id, capabilityId: "cap-export" }]
      : [],
  };
  const check = (
    id: string,
    subjectId: string,
    claim: string,
    category: ReleaseCheck["category"],
  ): ReleaseCheck => ({
    id,
    assessmentId: assessment.id,
    subjectType: "capability",
    subjectId,
    revision: 1,
    claim,
    category,
    required: true,
    ownerLabel:
      capabilities.find((item) => item.id === subjectId)?.ownerLabel ??
      "Release owner",
    method: "Review the relevant test run and record its result.",
    environment: assessment.validationEnvironment,
    maxAgeMs: 24 * HOUR,
    archivedAt: null,
  });
  const checks = [
    check(
      "check-export",
      "cap-export",
      "Invoice CSV includes all tax fields.",
      "functional",
    ),
    check(
      "check-webhook",
      "cap-webhook",
      "Duplicate delivery creates only one ledger entry.",
      "functional",
    ),
    check(
      "check-recovery",
      "cap-recover",
      "Recovery tokens expire and cannot be reused.",
      "functional",
    ),
    check(
      "check-reconcile",
      "cap-reconcile",
      "Recovery from a worker failure completes without data loss.",
      "functional",
    ),
    check(
      "check-search",
      "cap-search",
      "Search only returns invoices belonging to this account.",
      "functional",
    ),
    {
      ...check(
        "check-rollback",
        "cap-webhook",
        "Rollback restores the previous worker version without losing events.",
        "operational",
      ),
      subjectType: "release" as const,
      subjectId: null,
    },
    {
      ...check(
        "check-security",
        "cap-webhook",
        "Partner signatures are checked before ingest.",
        "security",
      ),
      required: false,
    },
  ];
  const evidence = (
    id: string,
    checkId: string,
    sequence: number,
    result: ReleaseEvidence["result"],
    summary: string,
    observedAt = now - HOUR,
  ): ReleaseEvidence => ({
    id,
    sequence,
    assessmentId: assessment.id,
    checkId,
    checkRevision: 1,
    candidateRef: assessment.candidateRef,
    environment: assessment.validationEnvironment,
    audience: assessment.audience,
    configurationRef: assessment.configurationRef,
    result,
    summary,
    source: "Example test review",
    runRef: `example-run-${sequence}`,
    eventId: `example-event-${sequence}`,
    observedAt,
    receivedAt: observedAt,
    actorId: null,
    actorName: "Example QA reviewer",
    credentialKind: "session",
    referenceUrl: null,
  });
  const detail: ReleaseDetail = {
    assessment,
    scope: capabilities.map((item) => ({
      assessmentId: assessment.id,
      capabilityId: item.id,
      name: item.name,
      outcome: item.outcome,
      definitionRevision: 1,
      ownerLabel: item.ownerLabel,
      included: true,
      scopeReason: "Critical outcome for this release.",
    })),
    checks,
    evidence: [
      evidence(
        "ev-export",
        "check-export",
        1,
        "fail",
        "Tax columns are absent in the export.",
      ),
      evidence(
        "ev-webhook",
        "check-webhook",
        2,
        "pass",
        "Duplicate deliveries produce one ledger entry.",
      ),
      evidence(
        "ev-recovery",
        "check-recovery",
        3,
        "pass",
        "Token validation passed two days ago.",
        now - 48 * HOUR,
      ),
      {
        ...evidence(
          "ev-search",
          "check-search",
          4,
          "pass",
          "Passed against a different candidate.",
        ),
        candidateRef: "sha256:demo-rc2-old",
      },
      evidence(
        "ev-rollback",
        "check-rollback",
        5,
        "pass",
        "Replay verifies rollback keeps all events.",
      ),
      evidence(
        "ev-signatures",
        "check-security",
        6,
        "pass",
        "Unsigned messages are rejected.",
      ),
    ],
    decisions: [],
    shares: [],
    assets: [],
  };
  const readiness = evaluateRelease(detail, now);
  detail.decisions = [
    {
      id: "decision-example",
      assessmentId: assessment.id,
      revision: 1,
      decision: "held",
      rationale:
        "Hold for the invoice export failure and missing current evidence. Webhook processing is verified.",
      actorId: null,
      actorName: "Example release owner",
      createdAt: now,
      expiresAt: readiness.validUntil,
      snapshot: {
        assessment,
        scope: detail.scope,
        checks,
        evidence: detail.evidence,
        readiness,
        components,
        capabilityComponents: product.capabilityComponents,
        dependencies: product.dependencies,
        regionCapabilities: product.regionCapabilities,
        screens,
        assets: [],
      },
    },
  ];
  return { product, detail, readiness, now };
}
