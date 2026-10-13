import {
  CHECK_CATEGORIES,
  RELEASE_VIEWS,
  type CheckCategory,
  type ReleaseView,
} from "../../lib/release-types.ts";

export interface ReleaseLocation {
  view: ReleaseView;
  check: string | null;
  category: CheckCategory | null;
  capability: string | null;
  component: string | null;
}

export function boundedRecordId(value: string | null | undefined) {
  return value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
}

export function boundedCategory(value: string | null | undefined) {
  return CHECK_CATEGORIES.find((category) => category === value) ?? null;
}

export function isReleaseLocation(pathname: string, basePath = "") {
  if (basePath && !pathname.startsWith(`${basePath}/`)) return false;
  const localPath = basePath ? pathname.slice(basePath.length) : pathname;
  return (
    /^\/boards\/[^/]+\/releases\/[^/]+\/?$/.test(localPath) ||
    /^\/share\/demo\/releases\/?$/.test(localPath)
  );
}

export function readReleaseLocation(search: string): ReleaseLocation {
  const params = new URLSearchParams(search);
  return {
    view:
      RELEASE_VIEWS.find((view) => view === params.get("view")) ?? "release",
    check: boundedRecordId(params.get("check")),
    category: boundedCategory(params.get("category")),
    capability: boundedRecordId(params.get("capability")),
    component: boundedRecordId(params.get("component")),
  };
}

/** One interaction writes one location, preserving the previous review context. */
export function releaseLocationUrl(
  href: string,
  patch: Partial<ReleaseLocation>,
) {
  const url = new URL(href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  const validated = readReleaseLocation(url.search);
  for (const key of ["check", "category", "capability", "component"] as const) {
    if (!validated[key]) url.searchParams.delete(key);
    else if (url.searchParams.has(key))
      url.searchParams.set(key, validated[key]);
  }
  if (url.searchParams.has("view"))
    url.searchParams.set("view", validated.view);
  return `${url.pathname}${url.search}${url.hash}`;
}
