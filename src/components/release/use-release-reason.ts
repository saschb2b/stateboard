"use client";

import { useTranslations } from "next-intl";

const evaluatorReasons = {
  "No evidence matches the current candidate, environment, audience and check revision.":
    "missing",
  "Verification failed.": "failed",
  "Verification failed; its evidence is also expired.": "failedExpired",
  "The latest verification could not establish this claim.": "inconclusive",
  "The latest passing verification has expired.": "stale",
  "Fresh matching verification passed.": "passed",
  "No capabilities are included in this assessment.": "noCapabilities",
} as const;

/** Localize evaluator-owned explanations without altering authored claims. */
export function useReleaseReason() {
  const t = useTranslations("Release");
  return (reason: string, capabilityName?: string): string => {
    if (
      capabilityName &&
      reason ===
        `${capabilityName} needs a required functional acceptance check.`
    )
      return t("findings.definitionGap", { name: capabilityName });
    if (Object.hasOwn(evaluatorReasons, reason))
      return t(
        `reasons.${evaluatorReasons[reason as keyof typeof evaluatorReasons]}`,
      );
    for (const [explanation, key] of Object.entries(evaluatorReasons)) {
      const suffix = `: ${explanation}`;
      if (reason.endsWith(suffix))
        return `${reason.slice(0, -suffix.length)}: ${t(`reasons.${key}`)}`;
    }
    return reason;
  };
}
