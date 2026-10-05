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

// Algumas edições usam "en" nos metadados e nomes canônicos ingleses como
// fallback. O código da edição e o título original identificam essas cópias.
function editionLanguage(title: string | undefined): string | null {
  if (!title) return null;
  const code = title.match(/\bnwt[-_]([a-z]{1,3})(?=[^a-z]|$)/i)?.[1]?.toLowerCase();
  if (code === "tpo") return "pt-PT";
  if (code === "t") return "pt-BR";
  if (code === "f") return "fr";
  if (code === "s") return "es";
  if (code === "e") return "en";
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("traduction du monde nouveau")) return "fr";
  if (normalized.includes("traducao do novo mundo")) return "pt";
  if (normalized.includes("traduccion del nuevo mundo")) return "es";
  return null;
}

// Só nomes distintivos: "Genesis" e outros nomes compartilhados entre
// idiomas não bastam para substituir o idioma do arquivo.
const DISTINCTIVE_BOOKS: Record<string, RegExp[]> = {
  fr: [/\bexode\b/i, /\bl[ée]vitique\b/i, /\bdeut[ée]ronome\b/i, /\bmatthieu\b/i, /\b[ée]sa[ïi]e\b/i, /\bapocalypse\b/i],
  de: [/\bsch[oö]pfung\b/i, /\brichter\b/i, /\bspr[uü]che\b/i, /\bmatth[aä]us\b/i, /\boffenbarung\b/i],
  it: [/\besodo\b/i, /\bgiudici\b/i, /\bmatteo\b/i, /\bgiovanni\b/i, /\bapocalisse\b/i],
};

function distinctiveLanguage(books: { displayName: string }[]): string | null {
  const scores = Object.entries(DISTINCTIVE_BOOKS).map(([lang, patterns]) => ({
    lang,
    score: books.filter((book) => patterns.some((pattern) => pattern.test(book.displayName))).length,
  })).sort((a, b) => b.score - a.score);
  return scores[0]?.score >= 2 && scores[0].score > (scores[1]?.score ?? 0) ? scores[0].lang : null;
}

/**
 * Idioma final: se os nomes dos livros indicam claramente pt/en/es e isso
 * contradiz o declarado, os livros vencem. Região só é mantida se o idioma
 * base coincidir; para pt sem região, infere Portugal por grafias europeias.
 */
export function resolveBibleLang(
  declared: string | null | undefined,
  books: { displayName: string }[],
  title?: string,
): { lang: string; langLabel: string } {
  let { base, region } = parseLangTag(declared);
  let detected = "unknown";
  try {
    detected = detectBibleLanguage(books as Parameters<typeof detectBibleLanguage>[0]);
  } catch { /* noop */ }
  const edition = editionLanguage(title);
  const distinct = distinctiveLanguage(books);
  if (edition) {
    ({ base, region } = parseLangTag(edition));
  } else if (distinct) {
    base = distinct;
    region = null;
  } else if (detected !== "unknown" && detected !== base && (base === "xx" || ["en", "pt", "es"].includes(base))) {
    base = detected;
    region = null;
  }
  if (base === "pt" && !region && books.some((b) => PT_PT_MARKERS.some((re) => re.test(b.displayName)))) {
    region = "pt";
  }
  return { lang: base, langLabel: labelFor(base, region) };
}
