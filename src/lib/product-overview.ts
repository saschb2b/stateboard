import { CHECK_CATEGORIES } from "./release-types.ts";
import type {
  Capability,
  CheckCategory,
  ProductContext,
  ReadinessState,
  ReleaseCapability,
  ReleaseCheck,
  ReleaseEvaluation,
  ReleaseOverview,
  ReleaseOverviewCheck,
  ReleaseOverviewCoverage,
} from "./release-types.ts";
import { dependencySlice } from "./readiness.ts";

/** Preserve evaluator results without copying evidence history or decision snapshots. */
export function buildReleaseOverviewCoverage(
  scope: ReleaseCapability[],
  checks: ReleaseCheck[],
  readiness: ReleaseEvaluation,
): ReleaseOverviewCoverage {
  const checksById = new Map(checks.map((check) => [check.id, check]));
  return {
    scope,
    capabilities: readiness.capabilities,
    checks: readiness.checks.flatMap((evaluation) => {
      const check = checksById.get(evaluation.checkId);
      return check
        ? [
            {
              id: check.id,
              subjectType: check.subjectType,
              subjectId: check.subjectId,
              claim: check.claim,
              category: check.category,
              ownerLabel: check.ownerLabel,
              required: evaluation.required,
              state: evaluation.state,
              evidenceId: evaluation.evidenceId,
              expiresAt: evaluation.expiresAt,
              reason: evaluation.reason,
            },
          ]
        : [];
    }),
  };
}

export interface OverviewCheckCounts {
  total: number;
  required: number;
  passed: number;
  blockers: number;
  gaps: number;
  optional: number;
  optionalWarnings: number;
}
export interface OverviewCategory extends OverviewCheckCounts {
  category: CheckCategory;
  state: ReadinessState | "not_defined" | "optional_only" | "unknown";
}
export interface OverviewCapability extends OverviewCheckCounts {
  capabilityId: string;
  name: string;
  outcome: string;
  ownerLabel: string;
  archived: boolean;
  inclusion: "included" | "excluded" | "not_scoped" | "unknown";
  state: ReadinessState | null;
  scope: ReleaseCapability | null;
  productCapability: Capability | null;
  newerDefinition: boolean;
  missingAcceptance: boolean | null;
  componentCount: number;
  screenCount: number;
}

function checkCounts(checks: ReleaseOverviewCheck[]): OverviewCheckCounts {
  const required = checks.filter((check) => check.required);
  const optional = checks.filter((check) => !check.required);
  return {
    total: checks.length,
    required: required.length,
    passed: required.filter((check) => check.state === "pass").length,
    blockers: required.filter((check) => check.state === "fail").length,
    gaps: required.filter(
      (check) => check.state !== "pass" && check.state !== "fail",
    ).length,
    optional: optional.length,
    optionalWarnings: optional.filter((check) => check.state !== "pass").length,
  };
}

/** Summaries describe one candidate. Declared mappings never establish readiness. */
export function buildProductOverview(
  product: ProductContext,
  selectedOverview: ReleaseOverview | undefined,
  now: number,
) {
  const overview =
    selectedOverview?.assessment.boardId === product.board.id
      ? selectedOverview
      : undefined;
  const coverage = overview?.coverage;
  const coverageKnown = coverage !== undefined;
  const hasAssessment = overview !== undefined || product.releases.length > 0;
  const evaluatedAt = Math.max(now, overview?.evaluatedAt ?? now);
  const checks = (coverage?.checks ?? []).map((check): ReleaseOverviewCheck =>
    check.state === "pass" &&
    check.expiresAt !== null &&
    check.expiresAt <= evaluatedAt
      ? {
          ...check,
          state: "stale",
          reason: "The latest passing verification has expired.",
        }
      : check,
  );
  const evidenceExpired =
    overview !== undefined &&
    overview.validUntil !== null &&
    overview.validUntil <= evaluatedAt;
  const state: ReadinessState | null = overview
    ? overview.state === "ready" && evidenceExpired
      ? "needs_evidence"
      : overview.state
    : null;
  const categories: OverviewCategory[] = CHECK_CATEGORIES.map((category) => {
    const counts = checkCounts(
      checks.filter((check) => check.category === category),
    );
    return {
      category,
      ...counts,
      state: !coverageKnown
        ? "unknown"
        : counts.total === 0
          ? "not_defined"
          : counts.required === 0
            ? "optional_only"
            : counts.blockers > 0
              ? "blocked"
              : counts.gaps > 0
                ? "needs_evidence"
                : "ready",
    };
  });
  const active = product.capabilities.filter(
    (capability) => capability.archivedAt === null,
  );
  const ids = [
    ...new Set([
      ...active.map((capability) => capability.id),
      ...(coverage?.scope.map((capability) => capability.capabilityId) ?? []),
    ]),
  ];
  const componentIds = new Set<string>();
  const mappedScreenIds = new Set<string>();
  let truncated = false;
  const capabilities: OverviewCapability[] = ids.map((capabilityId) => {
    const capability =
      product.capabilities.find((item) => item.id === capabilityId) ?? null;
    const scope =
      coverage?.scope.find((item) => item.capabilityId === capabilityId) ??
      null;
    const evaluation = coverage?.capabilities.find(
      (item) => item.capabilityId === capabilityId,
    );
    const ownChecks = checks.filter(
      (check) =>
        check.subjectType === "capability" && check.subjectId === capabilityId,
    );
    const counts = checkCounts(ownChecks);
    const slice = dependencySlice(product, capabilityId);
    const linked = slice.components.filter((item) => item.archivedAt === null);
    const regionIds = new Set(
      product.regionCapabilities
        .filter((link) => link.capabilityId === capabilityId)
        .map((link) => link.regionId),
    );
    const screens = product.screens.filter((screen) =>
      screen.regions.some((region) => regionIds.has(region.id)),
    );
    if (capability?.archivedAt === null) {
      for (const component of linked) componentIds.add(component.id);
      for (const screen of screens) mappedScreenIds.add(screen.id);
      truncated ||= slice.truncated;
    }
    return {
      capabilityId,
      name: scope?.name ?? capability?.name ?? capabilityId,
      outcome: scope?.outcome ?? capability?.outcome ?? "",
      ownerLabel: scope?.ownerLabel ?? capability?.ownerLabel ?? "",
      archived: capability?.archivedAt !== null && capability !== null,
      inclusion: scope
        ? scope.included
          ? "included"
          : "excluded"
        : hasAssessment && !coverageKnown
          ? "unknown"
          : "not_scoped",
      state:
        scope?.included && evaluation
          ? evaluation.state === "ready" && counts.gaps > 0
            ? "needs_evidence"
            : evaluation.state
          : null,
      scope,
      productCapability: capability,
      newerDefinition: !!(
        scope &&
        capability &&
        capability.definitionRevision > scope.definitionRevision
      ),
      missingAcceptance: scope?.included
        ? !ownChecks.some(
            (check) => check.required && check.category === "functional",
          )
        : null,
      componentCount: linked.length,
      screenCount: screens.length,
      ...counts,
    };
  });
  return {
    overview,
    coverageKnown,
    state,
    evidenceExpired,
    checks,
    categories,
    capabilities,
    findings: checks
      .filter((check) => check.required && check.state !== "pass")
      .sort((a, b) => Number(b.state === "fail") - Number(a.state === "fail")),
    missingAcceptance: capabilities.filter(
      (capability) => capability.missingAcceptance === true,
    ),
    counts: {
      activeCapabilities: active.length,
      included: capabilities.filter(
        (capability) => capability.inclusion === "included",
      ).length,
      excluded: capabilities.filter(
        (capability) => capability.inclusion === "excluded",
      ).length,
      notScoped: capabilities.filter(
        (capability) => capability.inclusion === "not_scoped",
      ).length,
      components: componentIds.size,
      dependencies: product.dependencies.filter(
        (link) =>
          componentIds.has(link.consumerId) &&
          componentIds.has(link.providerId),
      ).length,
      screens: product.screens.length,
      mappedScreens: mappedScreenIds.size,
      mappedCapabilities: capabilities.filter(
        (capability) => !capability.archived && capability.componentCount > 0,
      ).length,
    },
    architectureTruncated: truncated,
  };
}
