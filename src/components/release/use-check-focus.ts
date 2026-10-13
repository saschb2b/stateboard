"use client";

import { useState, useSyncExternalStore } from "react";

const CHECK_EVENT = "stateboard-check-focus";
const VIEW_EVENT = "stateboard-release-view";
const boundedCheckId = (value: string | null | undefined) =>
  value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(CHECK_EVENT, callback);
  window.addEventListener(VIEW_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(CHECK_EVENT, callback);
    window.removeEventListener(VIEW_EVENT, callback);
  };
}

function readCheck(): string | null | undefined {
  if (!window.location.pathname.includes("/releases")) return undefined;
  return boundedCheckId(
    new URL(window.location.href).searchParams.get("check"),
  );
}

export function useCheckFocus(initial?: string) {
  const [localCheck, setLocalCheck] = useState(boundedCheckId(initial));
  const locationCheck = useSyncExternalStore(
    subscribe,
    readCheck,
    () => undefined,
  );
  function setCheckId(checkId: string | null) {
    const next = boundedCheckId(checkId);
    setLocalCheck(next);
    if (!window.location.pathname.includes("/releases")) return;
    window.history.replaceState(
      null,
      "",
      checkFocusUrl(window.location.href, next),
    );
    window.dispatchEvent(new Event(CHECK_EVENT));
  }
  return [
    locationCheck === undefined ? localCheck : locationCheck,
    setCheckId,
  ] as const;
}

export function checkFocusUrl(href: string, checkId: string | null): string {
  const url = new URL(href);
  const next = boundedCheckId(checkId);
  if (next) url.searchParams.set("check", next);
  else url.searchParams.delete("check");
  return `${url.pathname}${url.search}${url.hash}`;
}
