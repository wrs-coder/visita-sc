// Detecção dinâmica de citações bíblicas baseada nos livros da biblioteca ativa.
// Os nomes/aliases vêm do próprio EPUB importado — sem listas fixas por idioma.

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

interface CompiledIndex {
  regex: RegExp;
  lookup: Map<string, { bookId: string; displayName: string }>;
}

const CACHE = new WeakMap<BookInfo[], CompiledIndex>();

function compile(books: BookInfo[]): CompiledIndex {
  const cached = CACHE.get(books);
  if (cached) return cached;

  const lookup = new Map<string, { bookId: string; displayName: string }>();
  // Importa o catálogo canônico de forma síncrona via require dinâmico
  // (evita ciclo em build). Usamos import estático no topo do bundle.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CANON } = require("./bible-canon") as typeof import("./bible-canon");

  const terms: { term: string; bookId: string; displayName: string }[] = [];
  for (const b of books) {
    // Aliases vindos do EPUB
    const all = [b.displayName, ...b.aliases];
    // Aliases canônicos multilíngues (se o bookId casar com B01..B66)
    const canon = CANON.find((c) => c.id === b.bookId);
    if (canon) all.push(...canon.aliases);
    for (const term of all) {
      const t = term.trim();
      if (!t) continue;
      const key = stripDiacritics(t.toLowerCase()).replace(/\.$/, "");
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
  for (const { term } of terms) {
    const k = stripDiacritics(term.toLowerCase());
    if (seenTerms.has(k)) continue;
    seenTerms.add(k);
    const visible = term.replace(/\s+/g, "");
    if (visible.length <= 2) shortParts.push(escapeRegex(term));
    else longParts.push(escapeRegex(term));
  }

  const branches: string[] = [];
  if (longParts.length > 0) {
    branches.push(`(?:${longParts.join("|")})\\.?\\s*(\\d{1,3}):(\\d{1,3})(?:[-–](\\d{1,3}))?`);
  }
  if (shortParts.length > 0) {
    branches.push(`(?:${shortParts.join("|")})(?:\\.\\s*|\\s+)(\\d{1,3}):(\\d{1,3})(?:[-–](\\d{1,3}))?`);
  }

  const source = `(?:^|[^a-záéíóúâêîôûãõçñü0-9])(${branches.join("|")})(?=$|[^a-záéíóúâêîôûãõçñü0-9])`;
  const regex = new RegExp(source, "giu");
  const out = { regex, lookup };
  CACHE.set(books, out);
  return out;
}

/** Re-extrai chapter:verse[-verseEnd] e o "termo do livro" da string casada. */
function dissect(raw: string): { bookTerm: string; chapter: number; verse: number; verseEnd?: number } | null {
  const m = raw.match(/^(.+?)\.?\s*(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?$/);
  if (!m) return null;
  return {
    bookTerm: m[1].trim(),
    chapter: parseInt(m[2], 10),
    verse: parseInt(m[3], 10),
    verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
  };
}

export function resolveBookId(books: BookInfo[], name: string): string | null {
  const { lookup } = compile(books);
  const key = stripDiacritics(name.toLowerCase()).replace(/\.$/, "");
  return lookup.get(key)?.bookId ?? null;
}

export function findCitations(books: BookInfo[] | undefined, text: string): CitationMatch[] {
  if (!books || books.length === 0 || !text) return [];
  const { regex, lookup } = compile(books);
  // Cria instância fresca para evitar lastIndex compartilhado
  const re = new RegExp(regex.source, regex.flags);
  const out: CitationMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const d = dissect(raw);
    if (!d) continue;
    const key = stripDiacritics(d.bookTerm.toLowerCase()).replace(/\.$/, "");
    const info = lookup.get(key);
    if (!info) continue;
    out.push({
      raw,
      bookId: info.bookId,
      bookName: info.displayName,
      chapter: d.chapter,
      verse: d.verse,
      verseEnd: d.verseEnd,
      index: m.index,
      length: raw.length,
    });
  }
  return out;
}
