import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGUAGES = ["pt", "en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "visita-sc-lang";

/** Primeiro idioma do aparelho suportado (pt/en/es); senão Português. */
export function pickDeviceLanguage(list: readonly (string | null | undefined)[]): SupportedLanguage {
  for (const raw of list) {
    const l = (raw || "").toLowerCase();
    if (l.startsWith("pt")) return "pt";
    if (l.startsWith("en")) return "en";
    if (l.startsWith("es")) return "es";
  }
  return "pt";
}

function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      return saved as SupportedLanguage;
    }
    const list = [...(window.navigator.languages ?? []), window.navigator.language];
    return pickDeviceLanguage(list);
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
