import type { CheckEvaluation } from "@/lib/release-types";

export const CHECK_RESULT_LABELS: Record<CheckEvaluation["state"], string> = {
  pass: "Passed",
  fail: "Failed",
  missing: "Missing evidence",
  stale: "Expired evidence",
  inconclusive: "Inconclusive",
};
