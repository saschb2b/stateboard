import type { ReleaseWorkspace } from "./release-types.ts";

/** Actionable, snapshot-free input for an agent's next verification; never a second evaluator. */
export function buildAgentReadiness(workspace: ReleaseWorkspace) {
  const { assessment, readiness, checks, scope, decisions } = workspace;
  const active = checks.filter((check) => check.archivedAt === null);
  const findings = readiness.checks.flatMap((evaluation) => {
    const check = active.find((item) => item.id === evaluation.checkId);
    return check && evaluation.state !== "pass" ? [{ check, evaluation }] : [];
  });
  const uncoveredCapabilities = scope.filter(
    (capability) =>
      capability.included &&
      !active.some(
        (check) =>
          check.subjectType === "capability" &&
          check.subjectId === capability.capabilityId &&
          check.required &&
          check.category === "functional",
      ),
  );
  const decision = [...decisions].sort(
    (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
  )[0];
  return {
    assessment,
    readiness,
    findings,
    uncoveredCapabilities,
    latestDecision: decision
      ? {
          decision: decision.decision,
          revision: decision.revision,
          createdAt: decision.createdAt,
          expiresAt: decision.expiresAt,
          current:
            decision.revision === assessment.revision &&
            (decision.expiresAt === null ||
              decision.expiresAt > readiness.evaluatedAt),
        }
      : null,
    reviewPath: `/boards/${assessment.boardId}/releases/${assessment.id}`,
  };
}
