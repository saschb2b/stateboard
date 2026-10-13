import {
  ReleaseError,
  type PublicReleaseProjection,
  type ReleaseDecision,
} from "./release-types.ts";

export interface ReleaseProjectionInput {
  summary: string;
  targetEnvironment?: string;
  audience?: string;
  capabilities: {
    capabilityId: string;
    name: string;
    outcome: string;
    explanation: string;
  }[];
  assetIds: string[];
}

function publicText(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ReleaseError(
      400,
      `${field} must be nonempty text of at most ${max} characters`,
    );
  }
  return value.trim();
}

/** Construct a fresh allowlist. Never spread the internal snapshot into public JSON. */
export function buildReleaseProjection(
  decision: ReleaseDecision,
  input: unknown,
): PublicReleaseProjection {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ReleaseError(400, "A publication selection is required");
  const selection = input as Record<string, unknown>;
  if (
    !Array.isArray(selection.capabilities) ||
    selection.capabilities.length > 100 ||
    !Array.isArray(selection.assetIds) ||
    selection.assetIds.length > 50
  ) {
    throw new ReleaseError(
      400,
      "Select at most 100 outcomes and 50 retained images",
    );
  }
  const seen = new Set<string>();
  const capabilities = selection.capabilities.map((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new ReleaseError(400, "Invalid public outcome");
    const entry = raw as Record<string, unknown>;
    const id = publicText(entry.capabilityId, "capabilityId", 200);
    const source = decision.snapshot.scope.find(
      (capability) => capability.capabilityId === id && capability.included,
    );
    if (!source || seen.has(id))
      throw new ReleaseError(400, "Select each included outcome only once");
    seen.add(id);
    return {
      name: publicText(entry.name, "Public outcome name", 200),
      outcome: publicText(entry.outcome, "Public outcome description"),
      explanation:
        typeof entry.explanation === "string" && entry.explanation.trim() === ""
          ? ""
          : publicText(entry.explanation, "Public explanation"),
      state:
        decision.snapshot.readiness.capabilities.find(
          (capability) => capability.capabilityId === id,
        )?.state ?? ("needs_evidence" as const),
    };
  });
  const imageIds = new Set<string>();
  const images = selection.assetIds.map((raw: unknown) => {
    const id = publicText(raw, "assetId", 200);
    const asset = decision.snapshot.assets.find(
      (candidate) => candidate.id === id,
    );
    if (!asset || imageIds.has(id))
      throw new ReleaseError(
        400,
        "Select each image from this recorded decision only once",
      );
    imageIds.add(id);
    return {
      assetId: asset.id,
      label: asset.label,
      width: asset.width,
      height: asset.height,
    };
  });
  return {
    candidateLabel: decision.snapshot.assessment.candidateLabel,
    targetEnvironment:
      selection.targetEnvironment === undefined
        ? decision.snapshot.assessment.targetEnvironment
        : publicText(
            selection.targetEnvironment,
            "Public target environment",
            200,
          ),
    audience:
      selection.audience === undefined
        ? decision.snapshot.assessment.audience
        : publicText(selection.audience, "Public audience", 200),
    reviewedAt: decision.createdAt,
    validUntil: decision.snapshot.readiness.validUntil,
    decision: decision.decision,
    readiness: decision.snapshot.readiness.state,
    summary: publicText(selection.summary, "Public summary"),
    capabilities,
    images,
  };
}
