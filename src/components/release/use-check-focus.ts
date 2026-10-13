"use client";

import { useState, useSyncExternalStore } from "react";
import {
  CHECK_CATEGORIES,
  type CheckCategory,
} from "../../lib/release-types.ts";

const CHECK_EVENT = "stateboard-check-focus";
const CATEGORY_EVENT = "stateboard-check-category";
const VIEW_EVENT = "stateboard-release-view";
const boundedCheckId = (value: string | null | undefined) =>
  value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
const boundedCategory = (value: string | null | undefined) =>
  CHECK_CATEGORIES.find((category) => category === value) ?? null;

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(CHECK_EVENT, callback);
  window.addEventListener(CATEGORY_EVENT, callback);
  window.addEventListener(VIEW_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(CHECK_EVENT, callback);
    window.removeEventListener(CATEGORY_EVENT, callback);
    window.removeEventListener(VIEW_EVENT, callback);
  };
}

function readCategory(): CheckCategory | null | undefined {
  if (!window.location.pathname.includes("/releases")) return undefined;
  return boundedCategory(
    new URL(window.location.href).searchParams.get("category"),
  );
}

export function useCheckCategory(initial?: CheckCategory) {
  const [localCategory, setLocalCategory] = useState(boundedCategory(initial));
  const locationCategory = useSyncExternalStore(
    subscribe,
    readCategory,
    () => undefined,
  );
  function setCategory(category: CheckCategory | null) {
    const next = boundedCategory(category);
    setLocalCategory(next);
    if (!window.location.pathname.includes("/releases")) return;
    window.history.replaceState(
      null,
      "",
      checkCategoryUrl(window.location.href, next),
    );
    window.dispatchEvent(new Event(CATEGORY_EVENT));
  }
  return [
    locationCategory === undefined ? localCategory : locationCategory,
    setCategory,
  ] as const;
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

export function checkCategoryUrl(
  href: string,
  category: string | null,
): string {
  const url = new URL(href);
  const next = boundedCategory(category);
  if (next) url.searchParams.set("category", next);
  else url.searchParams.delete("category");
  return `${url.pathname}${url.search}${url.hash}`;
}
