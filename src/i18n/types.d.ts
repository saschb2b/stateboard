import type { messages } from "./catalog";
import type { AppLocale } from "./config";
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: (typeof messages)["en"];
  }
}
