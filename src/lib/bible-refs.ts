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
  /** Versos discretos quando a citação usa vírgulas (ex.: "1 Pe 1:3,5" → [3, 5]). */
  verses?: number[];
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

  // Sufixo opcional: intervalo "-N" OU lista ",N(,N)*"
  const RANGE_OR_LIST = `(?:\\s*[-–]\\s*\\d{1,3}|(?:\\s*,\\s*\\d{1,3})+)?`;
  const branches: string[] = [];
  // Branches com cap:vers — vêm primeiro para que "Judas 1:5" case como cap:vers
  if (longParts.length > 0) {
    branches.push(`(?:${longParts.join("|")})\\.?\\s*\\d{1,3}:\\d{1,3}${RANGE_OR_LIST}`);
  }
  if (shortParts.length > 0) {
    branches.push(`(?:${shortParts.join("|")})(?:\\.\\s*|\\s+)\\d{1,3}:\\d{1,3}${RANGE_OR_LIST}`);
  }
  // Branches "verso-only" para livros de capítulo único (Judas 5, Fm 6...)
  if (longSingleParts.length > 0) {
    branches.push(`(?:${longSingleParts.join("|")})\\.?\\s*\\d{1,3}${RANGE_OR_LIST}`);
  }
  if (shortSingleParts.length > 0) {
    branches.push(`(?:${shortSingleParts.join("|")})(?:\\.\\s*|\\s+)\\d{1,3}${RANGE_OR_LIST}`);
  }

  const boundary = "a-zA-ZáéíóúâêîôûãõçñüÁÉÍÓÚÂÊÎÔÛÃÕÇÑÜ0-9";
  const source = `(?:^|[^${boundary}])(${branches.join("|")})(?=$|[^${boundary}])`;
  const regex = new RegExp(source, "giu");
  const out = { regex, lookup };
  perLang.set(lang, out);
  return out;
}

/** Re-extrai chapter:verse[-verseEnd] OU lista por vírgula e o "termo do livro" da string casada. */
function dissect(raw: string): {
  bookTerm: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  verses?: number[];
  noColon: boolean;
} | null {
  // Lista por vírgula com capítulo: "1 Pedro 1:3,5" ou "1 Pe 1:3, 5, 7"
  const mList = raw.match(/^(.+?)\.?\s*(\d{1,3}):(\d{1,3}(?:\s*,\s*\d{1,3})+)$/);
  if (mList) {
    const nums = mList[3].split(",").map((n) => parseInt(n.trim(), 10)).filter((n) => n > 0);
    return {
      bookTerm: mList[1].trim(),
      chapter: parseInt(mList[2], 10),
      verse: nums[0],
      verses: nums,
      noColon: false,
    };
  }
  const m = raw.match(/^(.+?)\.?\s*(\d{1,3}):(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/);
  if (m) {
    return {
      bookTerm: m[1].trim(),
      chapter: parseInt(m[2], 10),
      verse: parseInt(m[3], 10),
      verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
      noColon: false,
    };
  }
  // Lista por vírgula sem capítulo (livros de 1 capítulo): "Judas 3,5"
  const mListNc = raw.match(/^(.+?)\.?\s*(\d{1,3}(?:\s*,\s*\d{1,3})+)$/);
  if (mListNc) {
    const nums = mListNc[2].split(",").map((n) => parseInt(n.trim(), 10)).filter((n) => n > 0);
    return {
      bookTerm: mListNc[1].trim(),
      chapter: 1,
      verse: nums[0],
      verses: nums,
      noColon: true,
    };
  }
  // Fallback sem capítulo (apenas livros de 1 capítulo)
  const m2 = raw.match(/^(.+?)\.?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/);
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
      verses: d.verses,
      index: startIdx,
      length: raw.length,
    });
  }
  return out;
}

/**
 * Remove tags HTML preservando o texto, para que `findCitations` (usado nos
 * "chips" detectados abaixo do editor) continue funcionando mesmo quando o
 * conteúdo da nota traz formatação rich (cores, marca-texto, bullets...).
 *
 * Substitui tags de bloco por espaços para evitar colagem de palavras (ex.:
 * "<p>João</p><p>3:16</p>" → "João 3:16" e não "João3:16").
 */
export function stripHtmlForDetection(html: string): string {
  if (!html) return "";
  if (typeof window !== "undefined" && "DOMParser" in window) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      // textContent já junta sem tags; mas blocos vizinhos perdem espaço.
      // Inserimos espaços antes de fechar tags de bloco/quebra.
      const blockTags = new Set(["P", "DIV", "BR", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6"]);
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
      const blocks: Element[] = [];
      let cur: Node | null = walker.currentNode;
      while ((cur = walker.nextNode())) {
        if (cur.nodeType === Node.ELEMENT_NODE && blockTags.has((cur as Element).tagName)) {
          blocks.push(cur as Element);
        }
      }
      for (const el of blocks) {
        el.appendChild(doc.createTextNode(" "));
      }
      return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
    } catch {
      // fallback regex
    }
  }
  return html
    .replace(/<(br|p|div|li|ul|ol|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Referências não reconhecidas (erro de digitação na abreviação do livro).
// ---------------------------------------------------------------------------

export interface UnknownCitation {
  raw: string;
  bookTerm: string;
  chapter: number;
  verse: number;
  index: number;
  length: number;
  /** Sugestão mais próxima (quando houver). */
  suggestion?: { bookId: string; displayName: string };
}

/** Damerau-Levenshtein: conta troca de letras vizinhas como 1 erro ("Joõa" → "João"). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Livro mais próximo do termo digitado (null quando a distância é grande demais). */
export function suggestBook(
  books: BookInfo[] | undefined,
  term: string,
): { bookId: string; displayName: string } | null {
  if (!books || books.length === 0 || !term) return null;
  const q = stripDiacritics(term.toLowerCase()).replace(/\.$/, "").replace(/\s+/g, " ").trim();
  if (q.length < 2) return null;
  let best: { bookId: string; displayName: string; score: number } | null = null;
  const prefixLen = (a: string, b: string) => {
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  };
  for (const b of books) {
    const candidates = [b.displayName, ...(b.aliases ?? [])];
    for (const c of candidates) {
      const k = stripDiacritics(c.toLowerCase()).replace(/\.$/, "").trim();
      if (!k) continue;
      // Distância máxima proporcional ao tamanho: termos curtos toleram menos erro.
      const limit = k.length <= 3 ? 1 : k.length <= 6 ? 2 : 3;
      const d = levenshtein(q, k);
      if (d > limit) continue;
      // Desempate por prefixo em comum ("joõa" → "joão", não "joel").
      const score = d - prefixLen(q, k) * 0.1;
      if (!best || score < best.score) {
        best = { bookId: b.bookId, displayName: b.displayName, score };
      }
    }
  }
  return best ? { bookId: best.bookId, displayName: best.displayName } : null;
}

const UNKNOWN_RE =
  /(?:^|[^\p{L}\p{N}])((?:[1-3]\s*)?\p{L}[\p{L}.]{1,14}(?:\s+\p{L}[\p{L}.]{1,14})?)\s*\.?\s*(\d{1,3})\s*:\s*(\d{1,3})/gu;

/**
 * Detecta trechos com cara de citação bíblica cujo livro NÃO foi reconhecido,
 * mas que têm um livro parecido na biblioteca (provável erro de digitação).
 * Só retorna casos com sugestão, evitando falsos positivos (horários etc.).
 */
export function findUnknownCitations(
  books: BookInfo[] | undefined,
  text: string,
  known?: CitationMatch[],
): UnknownCitation[] {
  if (!books || books.length === 0 || !text) return [];
  const lang = detectBibleLanguage(books);
  const { lookup } = compile(books, lang);
  const taken = (known ?? findCitations(books, text)).map((m) => [m.index, m.index + m.length] as const);
  const out: UnknownCitation[] = [];
  const re = new RegExp(UNKNOWN_RE.source, UNKNOWN_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const bookTerm = m[1].trim();
    const raw = `${bookTerm} ${m[2]}:${m[3]}`;
    const start = m.index + m[0].indexOf(m[1]);
    const end = start + m[0].length - m[0].indexOf(m[1]);
    if (taken.some(([s, e]) => start < e && end > s)) continue;
    const key = stripDiacritics(bookTerm.toLowerCase()).replace(/\.$/, "");
    if (lookup.has(key)) continue;
    // O capture pode trazer a palavra anterior ("Veja Joõa"); tenta o termo
    // completo e, se não houver sugestão, apenas a última palavra.
    let term = bookTerm;
    let suggestion = suggestBook(books, term);
    if (!suggestion) {
      const parts = bookTerm.split(/\s+/);
      if (parts.length > 1) {
        const tail = parts.slice(-1)[0];
        const tailKey = stripDiacritics(tail.toLowerCase()).replace(/\.$/, "");
        if (lookup.has(tailKey)) continue;
        suggestion = suggestBook(books, tail);
        if (suggestion) term = tail;
      }
    }
    if (!suggestion) continue;
    const offset = bookTerm.length - term.length;
    const rawFixed = `${term} ${m[2]}:${m[3]}`;
    out.push({
      raw: rawFixed,
      bookTerm: term,
      chapter: parseInt(m[2], 10),
      verse: parseInt(m[3], 10),
      index: start + offset,
      length: end - start - offset,
      suggestion,
    });
  }
  return out;
}
