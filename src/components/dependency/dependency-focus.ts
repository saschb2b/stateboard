import type {
  ComponentDependency,
  ProductContext,
  ReleaseDetail,
} from "../../lib/release-types.ts";
import type { CheckSubjectScope } from "../evidence/check-scope.ts";

/** Declared supporting relationships belong in the slice too; they are not gates. */
function componentClosure(
  dependencies: ComponentDependency[],
  seeds: string[],
  reverse: boolean,
  limit: number,
) {
  const visited = new Set<string>();
  const queue = [...seeds];
  while (queue.length && visited.size < limit) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    for (const link of dependencies) {
      if ((reverse ? link.providerId : link.consumerId) === id) {
        queue.push(reverse ? link.consumerId : link.providerId);
      }
    }
  }
  return {
    componentIds: [...visited],
    truncated: queue.some((id) => !visited.has(id)),
  };
}

/** The workspace catalog is reusable, but the default view is this product's wiring. */
export function productComponentFocus(product: ProductContext, limit = 200) {
  const capabilityIds = new Set(
    product.capabilities
      .filter((item) => item.archivedAt === null)
      .map((item) => item.id),
  );
  return componentClosure(
    product.dependencies,
    product.capabilityComponents
      .filter((link) => capabilityIds.has(link.capabilityId))
      .map((link) => link.componentId),
    false,
    limit,
  );
}

/** Pure presentation scope: readiness continues to evaluate the entire assessment. */
export function dependencyFocus(
  product: ProductContext,
  detail: ReleaseDetail,
  capabilityId: string | null = null,
  componentId: string | null = null,
  limit = 200,
) {
  const includedIds = detail.scope
    .filter((item) => item.included)
    .map((item) => item.capabilityId);
  const included = new Set(includedIds);
  const links = product.capabilityComponents.filter((link) =>
    included.has(link.capabilityId),
  );
  const componentChecks = detail.checks
    .filter(
      (check) =>
        check.archivedAt === null &&
        check.subjectType === "component" &&
        check.subjectId !== null,
    )
    .map((check) => check.subjectId!);
  const assessment = componentClosure(
    product.dependencies,
    [...links.map((link) => link.componentId), ...componentChecks],
    false,
    limit,
  );
  const upstream = componentClosure(
    product.dependencies,
    componentId ? [componentId] : [],
    true,
    limit,
  );
  const upstreamIds = new Set(upstream.componentIds);
  const impactedIds = includedIds.filter((id) =>
    links.some(
      (link) => link.capabilityId === id && upstreamIds.has(link.componentId),
    ),
  );
  const capabilityIds = componentId
    ? impactedIds
    : capabilityId
      ? includedIds.filter((id) => id === capabilityId)
      : includedIds;
  const focused = capabilityId !== null || componentId !== null;
  const slice = focused
    ? componentClosure(
        product.dependencies,
        [
          ...links
            .filter((link) => capabilityIds.includes(link.capabilityId))
            .map((link) => link.componentId),
          ...(componentId ? [componentId] : []),
        ],
        false,
        limit,
      )
    : assessment;
  const componentIds = new Set(slice.componentIds);
  const checkScope: CheckSubjectScope | null = focused
    ? {
        capabilityIds,
        componentIds: slice.componentIds,
        includeRelease: true,
      }
    : null;
  return {
    components: product.components.filter((item) => componentIds.has(item.id)),
    dependencies: product.dependencies.filter(
      (link) =>
        componentIds.has(link.consumerId) && componentIds.has(link.providerId),
    ),
    assessmentComponents: product.components.filter((item) =>
      assessment.componentIds.includes(item.id),
    ),
    impacted: detail.scope.filter((item) =>
      impactedIds.includes(item.capabilityId),
    ),
    capabilityIds,
    checkScope,
    truncated: slice.truncated || upstream.truncated || assessment.truncated,
  };
}
