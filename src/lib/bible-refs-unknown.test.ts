import { describe, it, expect } from "vitest";
import { CANON } from "./bible-canon";
import { findUnknownCitations, suggestBook, suggestBooks, type BookInfo } from "./bible-refs";

const PT: Record<string, string> = {
  B13: "1 Crônicas", B18: "Jó", B19: "Salmos", B40: "Mateus", B43: "João",
  B45: "Romanos", B46: "1 Coríntios", B66: "Apocalipse",
};

const books: BookInfo[] = CANON.map((c) => ({
  bookId: c.id,
  displayName: PT[c.id] ?? c.english,
  aliases: [],
}));

// Como a Bíblia real importada do EPUB traz aliases próprios, usamos os
// aliases canônicos para simular abreviações comuns ("1Co", "1Cro"...).
const booksWithAliases: BookInfo[] = CANON.map((c) => ({
  bookId: c.id,
  displayName: PT[c.id] ?? c.english,
  aliases: c.aliases,
}));

describe("findUnknownCitations", () => {
  it("sugere o livro mais próximo para abreviação com erro", () => {
    const out = findUnknownCitations(books, "Veja Joõa 3:16 no esboço");
    expect(out).toHaveLength(1);
    expect(out[0].suggestion?.bookId).toBe("B43");
    expect(out[0].chapter).toBe(3);
    expect(out[0].verse).toBe(16);
  });

  it("ignora citações válidas", () => {
    expect(findUnknownCitations(books, "João 3:16")).toHaveLength(0);
  });

  it("não marca horários nem palavras comuns", () => {
    expect(findUnknownCitations(books, "A reunião começa às 19:30 hoje")).toHaveLength(0);
    expect(findUnknownCitations(books, "Resultado final 2:1 no jogo")).toHaveLength(0);
  });

  it("suggestBook devolve null para termos distantes", () => {
    expect(suggestBook(books, "Congregação")).toBeNull();
  });

  it("suggestBooks devolve até 3 opções e inclui João para 'Joõa'", () => {
    const out = suggestBooks(books, "Joõa");
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out[0].bookId).toBe("B43");
    expect(out.map((s) => s.bookId)).toContain("B43");
  });

  it("suggestBooks distingue livros parecidos ('1Co' → 1 Coríntios e 1 Crônicas)", () => {
    const out = suggestBooks(booksWithAliases, "1Co");
    const ids = out.map((s) => s.bookId);
    expect(ids).toContain("B46");
    expect(ids).toContain("B13");
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("findUnknownCitations preenche a lista de sugestões", () => {
    const out = findUnknownCitations(booksWithAliases, "Texto com 1Corintias 3:16 errado");
    expect(out).toHaveLength(1);
    expect(out[0].suggestions?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(out[0].suggestions?.map((s) => s.bookId)).toContain("B46");
    expect(out[0].suggestion?.bookId).toBe(out[0].suggestions?.[0].bookId);
  });

  it("suggestBooks devolve vazio para termos distantes ou comuns", () => {
    expect(suggestBooks(books, "Congregação")).toEqual([]);
    expect(suggestBooks(books, "às")).toEqual([]);
  });
});
