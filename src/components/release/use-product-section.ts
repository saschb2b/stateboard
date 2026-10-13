"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type ProductSection =
  "overview" | "releases" | "capabilities" | "dependencies" | "connections";
const sections: ProductSection[] = [
  "overview",
  "releases",
  "capabilities",
  "dependencies",
  "connections",
];
const event = "stateboard-product-section";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(event, callback);
  };
}
function isProductPage(pathname: string) {
  return /^\/boards\/[^/]+\/releases\/?$/.test(pathname);
}
function readSection(): ProductSection | null {
  if (!isProductPage(window.location.pathname)) return null;
  const value = new URL(window.location.href).searchParams.get("section");
  return sections.find((section) => section === value) ?? "overview";
}
export function useProductSection() {
  // Next links update router context without firing the browser's popstate event.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routerSection = isProductPage(pathname)
    ? (sections.find((section) => section === searchParams.get("section")) ??
      "overview")
    : null;
  const [local, setLocal] = useState<ProductSection>("overview");
  const location = useSyncExternalStore(subscribe, readSection, () => null);
  function select(next: ProductSection) {
    setLocal(next);
    if (!isProductPage(window.location.pathname) || readSection() === next)
      return;
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("section");
    else url.searchParams.set("section", next);
    window.history.pushState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    window.dispatchEvent(new Event(event));
  }
  return [routerSection ?? location ?? local, select] as const;
}
