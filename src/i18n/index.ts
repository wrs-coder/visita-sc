import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGUAGES = ["pt", "en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "visita-sc-lang";

function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      return saved as SupportedLanguage;
    }
    const nav = (window.navigator.language || "pt").toLowerCase();
    if (nav.startsWith("en")) return "en";
    if (nav.startsWith("es")) return "es";
    return "pt";
  } catch {
    return "pt";
  }
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: pt },
        en: { translation: en },
        es: { translation: es },
      },
      lng: detectInitialLanguage(),
      fallbackLng: "pt",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      returnNull: false,
    });
}

export function changeLanguage(lng: SupportedLanguage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore storage errors (private mode, SSR)
  }
  return i18n.changeLanguage(lng);
}

export default i18n;
