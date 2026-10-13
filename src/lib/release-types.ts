import type { Board, ScreenWithRegions } from "./types";

export const COMPONENT_KINDS = [
  "service",
  "api",
  "event",
  "worker",
  "datastore",
  "external",
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];
export const CHECK_CATEGORIES = [
  "functional",
  "integration",
  "ux",
  "data",
  "security",
  "operational",
] as const;
export type CheckCategory = (typeof CHECK_CATEGORIES)[number];
export const RELEASE_VIEWS = [
  "release",
  "visual",
  "backend",
  "qa",
  "operations",
  "decision",
] as const;
export type ReleaseView = (typeof RELEASE_VIEWS)[number];
export type ReadinessState = "ready" | "blocked" | "needs_evidence";
export type EvidenceResult = "pass" | "fail" | "inconclusive";
export interface ReleaseActor {
  userId: string;
  name: string;
  credentialKind: "session" | "api_key";
  credentialId?: string | null;
}
export interface Capability {
  id: string;
  boardId: string;
  name: string;
  outcome: string;
  definitionRevision: number;
  ownerLabel: string;
  ownerUserId: string | null;
  ownerNeedsReassignment?: boolean;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
export interface ProductComponent {
  id: string;
  workspaceId: string;
  name: string;
  kind: ComponentKind;
  ownerLabel: string;
  ownerUserId: string | null;
  ownerNeedsReassignment?: boolean;
  description: string;
  referenceUrl: string | null;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
export interface CapabilityComponent {
  capabilityId: string;
  componentId: string;
  relation: string;
  required: boolean;
  description: string;
}
export interface ComponentDependency {
  id: string;
  consumerId: string;
  providerId: string;
  relation: string;
  required: boolean;
  description: string;
}
export interface RegionCapability {
  regionId: string;
  capabilityId: string;
}
export interface ReleaseAssessment {
  id: string;
  boardId: string;
  candidateLabel: string;
  candidateRef: string;
  validationEnvironment: string;
  targetEnvironment: string;
  audience: string;
  configurationRef: string;
  ownerLabel: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
}
export interface ReleaseCapability {
  assessmentId: string;
  capabilityId: string;
  name: string;
  outcome: string;
  definitionRevision: number;
  ownerLabel: string;
  included: boolean;
  scopeReason: string;
}
export interface ReleaseCheck {
  id: string;
  assessmentId: string;
  subjectType: "capability" | "component" | "release";
  subjectId: string | null;
  revision: number;
  claim: string;
  category: CheckCategory;
  required: boolean;
  ownerLabel: string;
  method: string;
  environment: string;
  maxAgeMs: number;
  archivedAt: number | null;
}
export interface ReleaseEvidence {
  id: string;
  sequence: number;
  assessmentId: string;
  checkId: string;
  checkRevision: number;
  candidateRef: string;
  environment: string;
  audience: string;
  configurationRef: string;
  result: EvidenceResult;
  summary: string;
  source: string;
  runRef: string;
  eventId: string;
  observedAt: number;
  receivedAt: number;
  actorId: string | null;
  actorName: string;
  credentialKind: "session" | "api_key";
  referenceUrl: string | null;
  credentialId?: string | null;
}
export interface CheckEvaluation {
  checkId: string;
  state: "pass" | "fail" | "inconclusive" | "missing" | "stale";
  required: boolean;
  evidenceId: string | null;
  reason: string;
  expiresAt: number | null;
}
export interface CapabilityEvaluation {
  capabilityId: string;
  name: string;
  state: ReadinessState;
  reasons: string[];
}
export interface ReleaseEvaluation {
  state: ReadinessState;
  evaluatedAt: number;
  evaluatorVersion: string;
  checks: CheckEvaluation[];
  capabilities: CapabilityEvaluation[];
  blockers: string[];
  gaps: string[];
  warnings: string[];
  validUntil: number | null;
}
export interface ReleaseAsset {
  id: string;
  assessmentId: string;
  decisionId: string | null;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  digest: string;
  label: string;
  createdAt: number;
}
export interface ReleaseSnapshot {
  assessment: ReleaseAssessment;
  scope: ReleaseCapability[];
  checks: ReleaseCheck[];
  evidence: ReleaseEvidence[];
  readiness: ReleaseEvaluation;
  components: ProductComponent[];
  capabilityComponents: CapabilityComponent[];
  dependencies: ComponentDependency[];
  /** Optional only for snapshots recorded before visual mappings were retained. */
  regionCapabilities?: RegionCapability[];
  screens: ScreenWithRegions[];
  assets: ReleaseAsset[];
}
export interface ReleaseDecision {
  id: string;
  assessmentId: string;
  revision: number;
  decision: "approved" | "held";
  rationale: string;
  actorId: string | null;
  actorName: string;
  createdAt: number;
  expiresAt: number | null;
  snapshot: ReleaseSnapshot;
}
export interface PublicReleaseProjection {
  candidateLabel: string;
  targetEnvironment: string;
  audience: string;
  reviewedAt: number;
  validUntil?: number | null;
  decision: "approved" | "held";
  readiness: ReadinessState;
  summary: string;
  capabilities: {
    name: string;
    outcome: string;
    state: ReadinessState;
    explanation: string;
  }[];
  images: { assetId: string; label: string; width: number; height: number }[];
}
export interface ReleaseShareLink {
  token: string;
  decisionId: string;
  projection: PublicReleaseProjection;
  createdAt: number;
  revokedAt: number | null;
}
export interface ProductContext {
  board: Board;
  capabilities: Capability[];
  components: ProductComponent[];
  capabilityComponents: CapabilityComponent[];
  dependencies: ComponentDependency[];
  regionCapabilities: RegionCapability[];
  screens: ScreenWithRegions[];
  releases: ReleaseAssessment[];
}
export interface ReleaseDetail {
  assessment: ReleaseAssessment;
  scope: ReleaseCapability[];
  checks: ReleaseCheck[];
  evidence: ReleaseEvidence[];
  decisions: ReleaseDecision[];
  shares: ReleaseShareLink[];
  assets: ReleaseAsset[];
}
export interface ReleaseWorkspace extends ReleaseDetail {
  product: ProductContext;
  readiness: ReleaseEvaluation;
}
export type ProductMutationType =
  | "capability.create"
  | "capability.update"
  | "capability.archive"
  | "component.create"
  | "component.update"
  | "component.archive"
  | "capability_component.put"
  | "capability_component.delete"
  | "dependency.create"
  | "dependency.delete"
  | "region_capability.put"
  | "region_capability.delete";
export interface ProductMutation {
  type: ProductMutationType;
  id?: string;
  data: Record<string, unknown>;
}
export type ReleaseMutationType =
  | "scope.put"
  | "check.create"
  | "check.revise"
  | "check.archive"
  | "evidence.create";
export interface ReleaseMutation {
  type: ReleaseMutationType;
  id?: string;
  expectedRevision: number;
  data: Record<string, unknown>;
}
export interface CreateAssessmentInput {
  candidateLabel: string;
  candidateRef: string;
  validationEnvironment: string;
  targetEnvironment: string;
  audience: string;
  configurationRef: string;
  ownerLabel: string;
  capabilityIds: string[];
}
export interface DecisionInput {
  expectedRevision: number;
  decision: "approved" | "held";
  rationale: string;
  screenIds: string[];
  assetIds?: string[];
}
export class ReleaseError extends Error {
  status: 400 | 403 | 404 | 409;
  constructor(status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.status = status;
    this.name = "ReleaseError";
  }
}
