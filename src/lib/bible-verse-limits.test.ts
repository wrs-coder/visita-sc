// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANON } from "./bible-canon";
import { findCitations, type BookInfo } from "./bible-refs";
import { readChapterVerseRange } from "./bible-outline-guard";
import { chapterLimitFrom, libraryLacksVerseCounts } from "./bible-notes-store";

const PT: Record<string, string> = { B40: "Mateus", B43: "João", B46: "1 Coríntios", B8: "Rute" };
const books: BookInfo[] = CANON.map((c) => ({ bookId: c.id, displayName: PT[c.id] ?? c.english, aliases: c.aliases }));

describe("contagem de versículos do EPUB", () => {
  it("Rute 1 (arquivo real da TNM) tem 22 versículos", () => {
    const html = readFileSync(join(__dirname, "__fixtures__/tnm/rute-1.xhtml"), "utf8");
    const doc = new DOMParser().parseFromString(html, "application/xhtml+xml");
    expect(readChapterVerseRange(doc)).toEqual({ chapter: 1, last: 22 });
  });
  it("arquivo sem a linha de navegação não inventa contagem", () => {
    const doc = new DOMParser().parseFromString("<html><body><p>1 Texto</p></body></html>", "text/html");
    expect(readChapterVerseRange(doc)).toBeNull();
  });
  it("limites: versículo acima do fim, capítulo inexistente e Bíblia antiga", () => {
    const lib = { verseCounts: { B8: { 1: 22, 2: 23, 3: 18, 4: 22 } } };
    expect(chapterLimitFrom(lib, "B8", 1, 30)).toEqual({ kind: "out-of-range", last: 22 });
    expect(chapterLimitFrom(lib, "B8", 1, 22)).toEqual({ kind: "ok", last: 22 });
    expect(chapterLimitFrom(lib, "B8", 5, 1)).toEqual({ kind: "no-chapter", chapters: 4 });
    expect(chapterLimitFrom({}, "B8", 1, 30)).toEqual({ kind: "unknown" });
    expect(libraryLacksVerseCounts({})).toBe(true);
    expect(libraryLacksVerseCounts(lib)).toBe(false);
  });
});

describe("citações novas", () => {
  it("trecho entre capítulos: Mateus 5:3–6:2", () => {
    const [m] = findCitations(books, "Leia Mateus 5:3–6:2 hoje");
    expect(m).toMatchObject({ bookId: "B40", chapter: 5, verse: 3, chapterEnd: 6, chapterEndVerse: 2, raw: "Mateus 5:3–6:2" });
  });
  it("ligação com 'e': João 3:16 e 17", () => {
    const [m] = findCitations(books, "João 3:16 e 17.");
    expect(m).toMatchObject({ bookId: "B43", chapter: 3, verses: [16, 17] });
  });
  it("'e' antes de outra citação não engole o livro seguinte", () => {
    const ms = findCitations(books, "João 3:16 e 1 Coríntios 2:3");
    expect(ms.map((x) => [x.bookId, x.chapter, x.verse])).toEqual([["B43", 3, 16], ["B46", 2, 3]]);
  });
  it("'e' seguido de palavra não vira versículo", () => {
    const [m] = findCitations(books, "João 3:16 e 2 irmãos");
    expect(m.verses).toBeUndefined();
    expect(m.raw).toBe("João 3:16");
  });
  it("formas antigas continuam iguais", () => {
    expect(findCitations(books, "João 3:16-18")[0]).toMatchObject({ verse: 16, verseEnd: 18 });
    expect(findCitations(books, "João 3:16, 18")[0]).toMatchObject({ verses: [16, 18] });
  });
});
