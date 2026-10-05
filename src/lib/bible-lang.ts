// Resolve o idioma de uma Bíblia importada (EPUB) combinando o idioma
// declarado no arquivo com os nomes reais dos livros. Só apresentação:
// não altera versículos, destaques nem notas.
import { detectBibleLanguage } from "./bible-refs";

const LANG_LABELS: Record<string, string> = {
  pt: "Português", en: "English", es: "Español", fr: "Français",
  de: "Deutsch", it: "Italiano", ja: "日本語", ko: "한국어",
  zh: "中文", ru: "Русский", nl: "Nederlands", pl: "Polski",
  sv: "Svenska", no: "Norsk", da: "Dansk", fi: "Suomi",
};

const REGION_LABELS: Record<string, string> = {
  "pt-br": "Português (Brasil)",
  "pt-pt": "Português (Portugal)",
};

/** "pt-PT" -> { base: "pt", region: "pt" }; vazio -> base "xx". */
export function parseLangTag(raw: string | null | undefined): { base: string; region: string | null } {
  const m = (raw ?? "").trim().toLowerCase().match(/^([a-z]{2,3})(?:[-_]([a-z]{2}))?/);
  if (!m) return { base: "xx", region: null };
  return { base: m[1], region: m[2] ?? null };
}

export function labelFor(base: string, region: string | null): string {
  if (region) {
    const fixed = REGION_LABELS[`${base}-${region}`];
    if (fixed) return fixed;
  }
  if (LANG_LABELS[base]) return LANG_LABELS[base];
  try {
    const dn = new Intl.DisplayNames([base], { type: "language" });
    const n = dn.of(base);
    if (n && n.toLowerCase() !== base) return n.charAt(0).toUpperCase() + n.slice(1);
  } catch { /* noop */ }
  return base.toUpperCase();
}

// Grafias típicas do português europeu nos nomes dos livros.
const PT_PT_MARKERS = [/\bg[ée]nesis\b/i, /\bactos\b/i];

/**
 * Idioma final: se os nomes dos livros indicam claramente pt/en/es e isso
 * contradiz o declarado, os livros vencem. Região só é mantida se o idioma
 * base coincidir; para pt sem região, infere Portugal por grafias europeias.
 */
export function resolveBibleLang(
  declared: string | null | undefined,
  books: { displayName: string }[],
): { lang: string; langLabel: string } {
  let { base, region } = parseLangTag(declared);
  let detected = "unknown";
  try {
    detected = detectBibleLanguage(books as Parameters<typeof detectBibleLanguage>[0]);
  } catch { /* noop */ }
  if (detected !== "unknown" && detected !== base) {
    base = detected;
    region = null;
  }
  if (base === "pt" && !region && books.some((b) => PT_PT_MARKERS.some((re) => re.test(b.displayName)))) {
    region = "pt";
  }
  return { lang: base, langLabel: labelFor(base, region) };
}
