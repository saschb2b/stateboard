"use client";

import { useTranslations, type TranslationValues } from "next-intl";

/** Localized text in server-rendered page composition; product data stays unchanged. */
export function Message({
  id,
  values,
}: {
  id: Parameters<ReturnType<typeof useTranslations<"Common">>>[0];
  values?: TranslationValues;
}) {
  const t = useTranslations("Common");
  return t(id, values);
}
