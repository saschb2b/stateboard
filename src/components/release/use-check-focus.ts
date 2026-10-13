"use client";

import type { CheckCategory } from "../../lib/release-types.ts";
import {
  boundedCategory,
  boundedRecordId,
  releaseLocationUrl,
} from "./release-location.ts";
import { useReleaseNavigation } from "./use-release-navigation.ts";

export function useCheckCategory(initial?: CheckCategory) {
  const [location, navigate] = useReleaseNavigation({
    category: boundedCategory(initial),
  });
  return [
    location.category,
    (category: CheckCategory | null) => navigate({ category }),
  ] as const;
}

export function useCheckFocus(initial?: string) {
  const [location, navigate] = useReleaseNavigation({
    check: boundedRecordId(initial),
  });
  return [
    location.check,
    (check: string | null) => navigate({ check: boundedRecordId(check) }),
  ] as const;
}

export function checkFocusUrl(href: string, checkId: string | null): string {
  return releaseLocationUrl(href, { check: boundedRecordId(checkId) });
}

export function checkCategoryUrl(
  href: string,
  category: string | null,
): string {
  return releaseLocationUrl(href, { category: boundedCategory(category) });
}
