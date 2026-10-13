"use client";

import type { ReleaseView } from "@/lib/release-types";
import { useReleaseNavigation } from "./use-release-navigation";

export function useReleaseView(initial: ReleaseView) {
  const [location, navigate] = useReleaseNavigation({ view: initial });
  return [location.view, (view: ReleaseView) => navigate({ view })] as const;
}
