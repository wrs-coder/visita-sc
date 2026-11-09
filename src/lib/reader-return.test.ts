import { describe, expect, it, beforeEach } from "vitest";
import { consumeReaderReturn, setReaderReturn, verseFromRef } from "./reader-return";
import { compactRefTitle } from "./book-abbrev";

describe("retorno ao leitor", () => {
  beforeEach(() => { const m = new Map<string, string>(); (globalThis as any).sessionStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) }; });
  it("volta ao mesmo capítulo e versículo uma única vez", () => {
    setReaderReturn({ track: "personal", chapterKey: "Proverbs:22", readingDay: null, verse: verseFromRef("Provérbios 22:11") });
    expect(consumeReaderReturn()).toEqual({ track: "personal", chapterKey: "Proverbs:22", readingDay: null, verse: 11 });
    expect(consumeReaderReturn()).toBeNull();
  });
});

describe("título do balão", () => {
  it("abrevia livro em título longo", () => { expect(compactRefTitle("1 Tessalonicenses", 5, "12,13")).toBe("1 Tes. 5:12,13"); });
  it("abrevia sempre, mesmo título curto", () => { expect(compactRefTitle("Mateus", 6, "33")).toBe("Mat. 6:33"); });
  it("Jeremias 51:1-64 não é cortado", () => { expect(compactRefTitle("Jeremias", 51, "1-64")).toBe("Jer. 51:1-64"); });
  it("livro de nome curtíssimo fica inteiro", () => { expect(compactRefTitle("Jó", 3, "1")).toBe("Jó 3:1"); });
});
