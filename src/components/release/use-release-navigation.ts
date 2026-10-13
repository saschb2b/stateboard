"use client";

import { useState, useSyncExternalStore } from "react";
import {
  isReleaseLocation,
  readReleaseLocation,
  releaseLocationUrl,
  type ReleaseLocation,
} from "./release-location.ts";

const event = "stateboard-release-navigation";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(event, callback);
  };
}
function readLocation() {
  return isReleaseLocation(window.location.pathname, basePath)
    ? window.location.search
    : null;
}

export function useReleaseNavigation(initial: Partial<ReleaseLocation> = {}) {
  const [local, setLocal] = useState<ReleaseLocation>({
    view: "release",
    check: null,
    category: null,
    capability: null,
    component: null,
    ...initial,
  });
  const search = useSyncExternalStore(subscribe, readLocation, () => null);
  const location = search === null ? local : readReleaseLocation(search);
  function navigate(patch: Partial<ReleaseLocation>) {
    setLocal((current) => ({ ...current, ...patch }));
    if (!isReleaseLocation(window.location.pathname, basePath)) return;
    const next = releaseLocationUrl(window.location.href, patch);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history.pushState(null, "", next);
    window.dispatchEvent(new Event(event));
  }
  return [location, navigate] as const;
}
