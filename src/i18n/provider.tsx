"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "./catalog";
import {
  defaultLocale,
  localeStorageKey,
  parseLocale,
  type AppLocale,
} from "./config";

const localeEvent = "stateboard-locale";
const LocalePreferenceContext = createContext<(locale: AppLocale) => void>(
  () => {},
);
let memoryLocale: AppLocale | undefined;
function readPreference() {
  if (memoryLocale !== undefined) return memoryLocale;
  try {
    const stored = window.localStorage.getItem(localeStorageKey);
    return stored === null
      ? (memoryLocale ?? defaultLocale)
      : parseLocale(stored);
  } catch {
    return memoryLocale ?? defaultLocale;
  }
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === localeStorageKey || event.key === null) {
      memoryLocale = undefined;
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(localeEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(localeEvent, callback);
  };
}
export function AppLocaleProvider({
  children,
  initialLocale = defaultLocale,
  persist = true,
}: {
  children: React.ReactNode;
  initialLocale?: AppLocale;
  persist?: boolean;
}) {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    () => initialLocale,
  );
  const [previewLocale, setPreviewLocale] = useState(initialLocale);
  const locale = persist ? preference : previewLocale;
  function setLocale(next: AppLocale) {
    if (!persist) {
      setPreviewLocale(next);
      return;
    }
    memoryLocale = next;
    try {
      window.localStorage.setItem(localeStorageKey, next);
    } catch {
      /* Preference still works for this session when storage is unavailable. */
    }
    window.dispatchEvent(new Event(localeEvent));
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [locale]);
  return (
    <LocalePreferenceContext value={setLocale}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </LocalePreferenceContext>
  );
}
export function useLocalePreference() {
  return useContext(LocalePreferenceContext);
}
