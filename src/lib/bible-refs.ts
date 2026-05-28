// Detecção dinâmica de citações bíblicas baseada nos livros da biblioteca ativa.
// Os nomes/aliases vêm do próprio EPUB importado + catálogo canônico multilíngue.

import { CANON } from "./bible-canon";

/** Tipo legado mantido apenas para compat com código antigo (será removido em 3.3). */
export type BibleLang = "pt" | "en" | "es";
/** Tipo legado: agora os bookIds são strings dinâmicas ("B01", "B02"...). */
export type BookId = string;

export interface BookInfo {
  bookId: string;
  displayName: string;
  aliases: string[];
}

export interface CitationMatch {
  raw: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  index: number;
  length: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Mapeia cada letra "base" para uma classe regex que aceita variantes acentuadas.
const ACCENT_CLASSES: Record<string, string> = {
  a: "[aáàâãäAÁÀÂÃÄ]",
  e: "[eéèêëEÉÈÊË]",
  i: "[iíìîïIÍÌÎÏ]",
  o: "[oóòôõöOÓÒÔÕÖ]",
  u: "[uúùûüUÚÙÛÜ]",
  c: "[cçCÇ]",
  n: "[nñNÑ]",
};

function accentInsensitivePattern(term: string): string {
  // Normaliza primeiro: "João" → "Joao", "Filêmon" → "Filemon", para que
  // cada letra-base mapeie corretamente para a classe que aceita acentos.
  const base = stripDiacritics(term);
  let out = "";
  for (const ch of base) {
    const lower = ch.toLowerCase();
    if (ACCENT_CLASSES[lower]) {
      out += ACCENT_CLASSES[lower];
    } else if (/\s/.test(ch)) {
      out += "\\s+";
    } else {
      out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return out;
}


interface CompiledIndex {
  regex: RegExp;
  lookup: Map<string, { bookId: string; displayName: string }>;
}

export type Lang = "pt" | "en" | "es" | "unknown";

const CACHE = new WeakMap<BookInfo[], Map<Lang, CompiledIndex>>();
const LANG_CACHE = new WeakMap<BookInfo[], Lang>();

// Livros bíblicos com apenas 1 capítulo — aceitam citação sem capítulo
// (ex.: "Judas 5" em vez de "Judas 1:5").
const SINGLE_CHAPTER_BOOK_IDS = new Set(["B31", "B57", "B63", "B64", "B65"]);

// Aliases que aparecem em mais de um livro do CANON. Mapeia idioma → bookId preferido.
// Para "unknown" mantemos o comportamento atual (primeiro a registrar vence).
const AMBIGUOUS_ALIASES: Record<string, Partial<Record<Lang, string>>> = {
  jo: { pt: "B43", en: "B18", es: "B18" }, // João vs Job
  jn: { pt: "B43", en: "B32" },             // João vs Jonas
  dn: { pt: "B27", en: "B05" },             // Daniel vs Deuteronômio
  jd: { pt: "B65", en: "B07" },             // Judas vs Juízes
  nm: { pt: "B04", en: "B04" },             // Números (sempre)
};

// Marcadores fortes por idioma (presentes nos displayName dos livros)
const LANG_MARKERS: Record<Exclude<Lang, "unknown">, RegExp[]> = {
  pt: [/\bjo[ãa]o\b/i, /\bmateus\b/i, /\bg[êe]nese/i, /\bapocalipse\b/i, /\bju[íi]zes\b/i, /\b[êe]xodo\b/i],
  en: [/\bjohn\b/i, /\bmatthew\b/i, /\bgenesis\b/i, /\brevelation\b/i, /\bjudges\b/i, /\bexodus\b/i],
  es: [/\bjuan\b/i, /\bmateo\b/i, /\bg[ée]nesis\b/i, /\bapocalipsis\b/i, /\bjueces\b/i, /\b[ée]xodo\b/i],
};

export function detectBibleLanguage(books: BookInfo[]): Lang {
  const cached = LANG_CACHE.get(books);
  if (cached) return cached;
  const scores: Record<Exclude<Lang, "unknown">, number> = { pt: 0, en: 0, es: 0 };
  for (const b of books) {
    const name = b.displayName;
    for (const lang of ["pt", "en", "es"] as const) {
      for (const re of LANG_MARKERS[lang]) {
        if (re.test(name)) scores[lang]++;
      }
    }
  }
  const best = (Object.entries(scores) as [Exclude<Lang, "unknown">, number][])
    .sort((a, b) => b[1] - a[1])[0];
  const lang: Lang = best && best[1] > 0 ? best[0] : "unknown";
  LANG_CACHE.set(books, lang);
  return lang;
}

function compile(books: BookInfo[], lang: Lang): CompiledIndex {
  let perLang = CACHE.get(books);
  if (perLang) {
    const cached = perLang.get(lang);
    if (cached) return cached;
  } else {
    perLang = new Map();
    CACHE.set(books, perLang);
  }

  const lookup = new Map<string, { bookId: string; displayName: string }>();
  const terms: { term: string; bookId: string; displayName: string }[] = [];
  for (const b of books) {
    const all = [b.displayName, ...b.aliases];
    const canon = CANON.find((c) => c.id === b.bookId);
    if (canon) all.push(...canon.aliases);
    for (const term of all) {
      const t = term.trim();
      if (!t) continue;
      const key = stripDiacritics(t.toLowerCase()).replace(/\.$/, "");
      // Filtro de aliases ambíguos por idioma da Bíblia
      const ambig = AMBIGUOUS_ALIASES[key];
      if (ambig && lang !== "unknown") {
        const preferred = ambig[lang];
        if (preferred && preferred !== b.bookId) continue; // pula: outro livro vence neste idioma
      }
      if (!lookup.has(key)) lookup.set(key, { bookId: b.bookId, displayName: b.displayName });
      terms.push({ term: t, bookId: b.bookId, displayName: b.displayName });
    }
  }


  // Ordena por comprimento decrescente para casar primeiro o nome mais longo.
  terms.sort((a, b) => b.term.length - a.term.length);

  // Deduplica por termo (case/accents-insensitive) preservando o mais longo
  const seenTerms = new Set<string>();
  const longParts: string[] = [];
  const shortParts: string[] = [];
  const longSingleParts: string[] = [];
  const shortSingleParts: string[] = [];
  for (const { term, bookId } of terms) {
    const k = stripDiacritics(term.toLowerCase());
    if (seenTerms.has(k)) continue;
    seenTerms.add(k);
    const visible = term.replace(/\s+/g, "");
    const pattern = accentInsensitivePattern(term);
    if (visible.length <= 2) shortParts.push(pattern);
    else longParts.push(pattern);
    if (SINGLE_CHAPTER_BOOK_IDS.has(bookId)) {
      if (visible.length <= 2) shortSingleParts.push(pattern);
      else longSingleParts.push(pattern);
    }
  }

  const branches: string[] = [];
  // Branches com cap:vers — vêm primeiro para que "Judas 1:5" case como cap:vers
  if (longParts.length > 0) {
    branches.push(`(?:${longParts.join("|")})\\.?\\s*\\d{1,3}:\\d{1,3}(?:[-–]\\d{1,3})?`);
  }
  if (shortParts.length > 0) {
    branches.push(`(?:${shortParts.join("|")})(?:\\.\\s*|\\s+)\\d{1,3}:\\d{1,3}(?:[-–]\\d{1,3})?`);
  }
  // Branches "verso-only" para livros de capítulo único (Judas 5, Fm 6...)
  if (longSingleParts.length > 0) {
    branches.push(`(?:${longSingleParts.join("|")})\\.?\\s*\\d{1,3}(?:[-–]\\d{1,3})?`);
  }
  if (shortSingleParts.length > 0) {
    branches.push(`(?:${shortSingleParts.join("|")})(?:\\.\\s*|\\s+)\\d{1,3}(?:[-–]\\d{1,3})?`);
  }

  const boundary = "a-zA-ZáéíóúâêîôûãõçñüÁÉÍÓÚÂÊÎÔÛÃÕÇÑÜ0-9";
  const source = `(?:^|[^${boundary}])(${branches.join("|")})(?=$|[^${boundary}])`;
  const regex = new RegExp(source, "giu");
  const out = { regex, lookup };
  perLang.set(lang, out);
  return out;
}

/** Re-extrai chapter:verse[-verseEnd] e o "termo do livro" da string casada. */
function dissect(raw: string): { bookTerm: string; chapter: number; verse: number; verseEnd?: number; noColon: boolean } | null {
  const m = raw.match(/^(.+?)\.?\s*(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?$/);
  if (m) {
    return {
      bookTerm: m[1].trim(),
      chapter: parseInt(m[2], 10),
      verse: parseInt(m[3], 10),
      verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
      noColon: false,
    };
  }
  // Fallback sem capítulo (apenas livros de 1 capítulo)
  const m2 = raw.match(/^(.+?)\.?\s*(\d{1,3})(?:[-–](\d{1,3}))?$/);
  if (m2) {
    return {
      bookTerm: m2[1].trim(),
      chapter: 1,
      verse: parseInt(m2[2], 10),
      verseEnd: m2[3] ? parseInt(m2[3], 10) : undefined,
      noColon: true,
    };
  }
  return null;
}


export function resolveBookId(books: BookInfo[], name: string): string | null {
  const lang = detectBibleLanguage(books);
  const { lookup } = compile(books, lang);
  const key = stripDiacritics(name.toLowerCase()).replace(/\.$/, "");
  return lookup.get(key)?.bookId ?? null;
}

export function findCitations(books: BookInfo[] | undefined, text: string): CitationMatch[] {
  if (!books || books.length === 0 || !text) return [];
  const lang = detectBibleLanguage(books);
  const { regex, lookup } = compile(books, lang);
  // Cria instância fresca para evitar lastIndex compartilhado
  const re = new RegExp(regex.source, regex.flags);
  const out: CitationMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]; // grupo 1 = citação real (sem o char de boundary do grupo 0)
    if (!raw) continue;
    const startIdx = m.index + m[0].indexOf(raw);
    const d = dissect(raw);
    if (!d) continue;
    const key = stripDiacritics(d.bookTerm.toLowerCase()).replace(/\.$/, "");
    const info = lookup.get(key);
    if (!info) continue;
    // Forma sem ":" só é válida para livros de capítulo único
    if (d.noColon && !SINGLE_CHAPTER_BOOK_IDS.has(info.bookId)) continue;
    out.push({
      raw,
      bookId: info.bookId,
      bookName: info.displayName,
      chapter: d.chapter,
      verse: d.verse,
      verseEnd: d.verseEnd,
      index: startIdx,
      length: raw.length,
    });
  }
  return out;
}
