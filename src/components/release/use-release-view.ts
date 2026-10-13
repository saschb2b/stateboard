"use client";

import { useState, useSyncExternalStore } from "react";
import { RELEASE_VIEWS, type ReleaseView } from "@/lib/release-types";

const VIEW_EVENT = "stateboard-release-view";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(VIEW_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(VIEW_EVENT, callback);
  };
}
function readView(): ReleaseView | null {
  if (!window.location.pathname.includes("/releases")) return null;
  const value = new URL(window.location.href).searchParams.get("view");
  return RELEASE_VIEWS.includes(value as ReleaseView)
    ? (value as ReleaseView)
    : "release";
}
export function useReleaseView(initial: ReleaseView) {
  const [localView, setLocalView] = useState(initial);
  const locationView = useSyncExternalStore(subscribe, readView, () => null);
  function changeView(next: ReleaseView) {
    setLocalView(next);
    if (!window.location.pathname.includes("/releases")) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    window.dispatchEvent(new Event(VIEW_EVENT));
  }
  return [locationView ?? localView, changeView] as const;
}
