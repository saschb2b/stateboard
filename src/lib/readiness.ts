import type {
  CheckEvaluation,
  ProductContext,
  ReadinessState,
  ReleaseDetail,
  ReleaseEvaluation,
  ReleaseEvidence,
} from "./release-types";

export const EVALUATOR_VERSION = "1";
export const READINESS_META = {
  ready: { label: "Ready", color: "success" },
  blocked: { label: "Blocked", color: "error" },
  needs_evidence: { label: "Needs evidence", color: "warning" },
} as const;

function conclusion(blockers: string[], gaps: string[]): ReadinessState {
  return blockers.length ? "blocked" : gaps.length ? "needs_evidence" : "ready";
}

/** Evidence verifies an exact claim in an exact assessment, never a UI badge. */
export function evaluateRelease(
  detail: ReleaseDetail,
  now: number,
): ReleaseEvaluation {
  const { assessment, scope, evidence } = detail;
  const included = scope.filter((capability) => capability.included);
  const includedIds = new Set(
    included.map((capability) => capability.capabilityId),
  );
  const checks = detail.checks.filter(
    (check) =>
      check.archivedAt === null &&
      (check.subjectType !== "capability" ||
        (check.subjectId !== null && includedIds.has(check.subjectId))),
  );
  const blockers: string[] = [];
  const gaps: string[] = [];
  const warnings: string[] = [];
  const evaluations: CheckEvaluation[] = checks.map((check) => {
    let selected: ReleaseEvidence | undefined;
    for (const observation of evidence) {
      if (
        observation.assessmentId !== assessment.id ||
        observation.checkId !== check.id ||
        observation.checkRevision !== check.revision ||
        observation.candidateRef !== assessment.candidateRef ||
        observation.environment !== check.environment ||
        observation.audience !== assessment.audience ||
        observation.configurationRef !== assessment.configurationRef ||
        !Number.isFinite(observation.observedAt) ||
        observation.observedAt > now
      )
        continue;
      if (
        !selected ||
        observation.observedAt > selected.observedAt ||
        (observation.observedAt === selected.observedAt &&
          observation.sequence > selected.sequence) ||
        (observation.observedAt === selected.observedAt &&
          observation.sequence === selected.sequence &&
          observation.id > selected.id)
      ) {
        selected = observation;
      }
    }
    const expiresAt = selected ? selected.observedAt + check.maxAgeMs : null;
    const fresh = expiresAt !== null && check.maxAgeMs > 0 && now < expiresAt;
    const state = !selected
      ? "missing"
      : selected.result === "fail"
        ? "fail"
        : selected.result === "inconclusive"
          ? "inconclusive"
          : fresh
            ? "pass"
            : "stale";
    const reason =
      state === "missing"
        ? "No evidence matches the current candidate, environment, audience and check revision."
        : state === "fail"
          ? fresh
            ? "Verification failed."
            : "Verification failed; its evidence is also expired."
          : state === "inconclusive"
            ? "The latest verification could not establish this claim."
            : state === "stale"
              ? "The latest passing verification has expired."
              : "Fresh matching verification passed.";
    const description = `${check.claim} · ${check.ownerLabel}`;
    if (check.required) {
      if (state === "fail") blockers.push(description);
      else if (state !== "pass") gaps.push(`${description}: ${reason}`);
    } else if (state !== "pass") warnings.push(`${description}: ${reason}`);
    return {
      checkId: check.id,
      state,
      required: check.required,
      evidenceId: selected?.id ?? null,
      reason,
      expiresAt,
    };
  });
  if (included.length === 0)
    gaps.push("No capabilities are included in this assessment.");
  const capabilities = included.map((capability) => {
    const ownChecks = checks.filter(
      (check) =>
        check.subjectType === "capability" &&
        check.subjectId === capability.capabilityId,
    );
    const ownIds = new Set(ownChecks.map((check) => check.id));
    const ownEvaluations = evaluations.filter(
      (evaluation) => ownIds.has(evaluation.checkId) && evaluation.required,
    );
    const ownBlockers = ownEvaluations
      .filter((evaluation) => evaluation.state === "fail")
      .map(
        (evaluation) =>
          ownChecks.find((check) => check.id === evaluation.checkId)?.claim ??
          evaluation.reason,
      );
    const ownGaps = ownEvaluations
      .filter(
        (evaluation) =>
          evaluation.state !== "pass" && evaluation.state !== "fail",
      )
      .map((evaluation) => evaluation.reason);
    if (
      !ownChecks.some(
        (check) => check.required && check.category === "functional",
      )
    ) {
      const reason = `${capability.name} needs a required functional acceptance check.`;
      gaps.push(reason);
      ownGaps.push(reason);
    }
    return {
      capabilityId: capability.capabilityId,
      name: capability.name,
      state: conclusion(ownBlockers, ownGaps),
      reasons: [...ownBlockers, ...ownGaps],
    };
  });
  const expiries = evaluations
    .filter((evaluation) => evaluation.required && evaluation.state === "pass")
    .flatMap((evaluation) =>
      evaluation.expiresAt === null ? [] : [evaluation.expiresAt],
    );
  return {
    state: conclusion(blockers, gaps),
    evaluatedAt: now,
    evaluatorVersion: EVALUATOR_VERSION,
    checks: evaluations,
    capabilities,
    blockers,
    gaps,
    warnings,
    validUntil: expiries.length ? Math.min(...expiries) : null,
  };
}

/** Bounded declared relationships. Neither edge presence nor uptime is a gate. */
export function dependencySlice(
  product: ProductContext,
  capabilityId: string,
  limit = 200,
) {
  const links = product.capabilityComponents.filter(
    (link) => link.capabilityId === capabilityId,
  );
  const visited = new Set<string>();
  const queue = links.map((link) => link.componentId);
  while (queue.length && visited.size < limit) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    product.dependencies
      .filter((dependency) => dependency.consumerId === id)
      .forEach((dependency) => queue.push(dependency.providerId));
  }
  return {
    components: product.components.filter((component) =>
      visited.has(component.id),
    ),
    dependencies: product.dependencies.filter(
      (dependency) =>
        visited.has(dependency.consumerId) &&
        visited.has(dependency.providerId),
    ),
    links,
    truncated: queue.some((id) => !visited.has(id)),
  };
}

export function affectedCapabilities(
  product: ProductContext,
  componentId: string,
  limit = 200,
) {
  const visited = new Set<string>();
  const queue = [componentId];
  while (queue.length && visited.size < limit) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    product.dependencies
      .filter((dependency) => dependency.providerId === id)
      .forEach((dependency) => queue.push(dependency.consumerId));
  }
  const ids = new Set(
    product.capabilityComponents
      .filter((link) => visited.has(link.componentId))
      .map((link) => link.capabilityId),
  );
  return product.capabilities.filter(
    (capability) => ids.has(capability.id) && capability.archivedAt === null,
  );
}
