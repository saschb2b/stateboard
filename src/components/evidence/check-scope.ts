import type {
  CheckCategory,
  CheckEvaluation,
  ReleaseCheck,
} from "../../lib/release-types";

/** A presentation slice. It never changes which checks determine readiness. */
export interface CheckSubjectScope {
  capabilityIds: string[];
  componentIds: string[];
  includeRelease: boolean;
}

export interface CheckFilters {
  subjectScope?: CheckSubjectScope;
  focusedCheckId?: string | null;
  operationsOnly?: boolean;
  includeFunctional?: boolean;
  needsAttention?: boolean;
  result?: CheckEvaluation["state"] | "not_evaluated" | "all";
  category?: CheckCategory | "all";
  query?: string;
}

export function isCheckInScope(
  check: ReleaseCheck,
  scope?: CheckSubjectScope,
): boolean {
  if (!scope) return true;
  if (check.subjectType === "release") return scope.includeRelease;
  if (check.subjectId === null) return false;
  return check.subjectType === "capability"
    ? scope.capabilityIds.includes(check.subjectId)
    : scope.componentIds.includes(check.subjectId);
}

export function checkNeedsAttention(evaluation?: CheckEvaluation): boolean {
  return evaluation !== undefined && evaluation.state !== "pass";
}

/** Focus shows exactly one active check, even when another filter would hide it. */
export function filterChecks(
  checks: readonly ReleaseCheck[],
  evaluations: readonly CheckEvaluation[],
  filters: CheckFilters = {},
): ReleaseCheck[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";
  const results = new Map(evaluations.map((item) => [item.checkId, item]));
  return checks.filter((check) => {
    if (check.archivedAt !== null) return false;
    if (filters.focusedCheckId) return check.id === filters.focusedCheckId;
    if (!isCheckInScope(check, filters.subjectScope)) return false;
    if (
      filters.operationsOnly &&
      !["operational", "security", "data"].includes(check.category) &&
      !(filters.includeFunctional && check.category === "functional")
    )
      return false;
    const evaluation = results.get(check.id);
    if (filters.needsAttention && !checkNeedsAttention(evaluation))
      return false;
    if (
      filters.result &&
      filters.result !== "all" &&
      (evaluation?.state ?? "not_evaluated") !== filters.result
    )
      return false;
    if (
      filters.category &&
      filters.category !== "all" &&
      check.category !== filters.category
    )
      return false;
    return (
      !query ||
      `${check.claim} ${check.ownerLabel} ${check.method}`
        .toLocaleLowerCase()
        .includes(query)
    );
  });
}
