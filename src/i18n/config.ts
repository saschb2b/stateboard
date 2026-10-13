export const locales = ["en", "de"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";
export const localeStorageKey = "stateboard.locale";
export function parseLocale(value: unknown): AppLocale {
  return value === "de" ? "de" : defaultLocale;
}
