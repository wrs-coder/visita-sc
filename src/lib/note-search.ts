/**
 * Localizar e substituir no esboço — lógica pura (sem editor), testável.
 * Busca sem diferenciar maiúsculas nem acentos ("jeova" acha "Jeová"),
 * mantendo as posições exatas do texto original.
 */
import { findCitations, type BookInfo } from "./bible-refs";

export interface TextRange {
  start: number;
  end: number;
}

/** Dobra um caractere por vez (mesmo tamanho do texto original). */
export function foldForSearch(text: string): string {
  let out = "";
  for (const ch of text) {
    let f = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (f.length !== ch.length) f = ch;
    const low = f.toLowerCase();
    out += low.length === f.length ? low : f;
  }
  return out;
}

/** Todas as ocorrências de `term` em `text`, sem sobreposição. */
export function findInText(text: string, term: string): TextRange[] {
  const t = foldForSearch(term);
  if (!t.trim() || !text) return [];
  const hay = foldForSearch(text);
  const out: TextRange[] = [];
  let i = hay.indexOf(t);
  while (i >= 0) {
    out.push({ start: i, end: i + t.length });
    i = hay.indexOf(t, i + t.length);
  }
  return out;
}

// Sem Bíblia importada: qualquer "Livro 3:16" (com ou sem número antes).
const CITATION_LIKE = /(?:[1-3]\s*)?\p{L}[\p{L}.]{1,14}\s*\d{1,3}\s*:\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*/gu;

/** Trechos com citação bíblica no texto de um parágrafo. */
export function citationRanges(text: string, books?: BookInfo[] | null): TextRange[] {
  if (!text) return [];
  if (books && books.length) {
    return findCitations(books, text).map((m) => ({ start: m.index, end: m.index + m.length }));
  }
  const out: TextRange[] = [];
  const re = new RegExp(CITATION_LIKE.source, CITATION_LIKE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

/** A troca atinge alguma citação bíblica? */
export function touchesCitation(range: TextRange, citations: TextRange[]): boolean {
  return citations.some((c) => range.start < c.end && range.end > c.start);
}
