import { describe, it, expect } from "vitest";
import { CANON } from "./bible-canon";
import { findUnknownCitations, suggestBook, type BookInfo } from "./bible-refs";

const PT: Record<string, string> = {
  B19: "Salmos", B40: "Mateus", B43: "João", B45: "Romanos", B66: "Apocalipse",
};

const books: BookInfo[] = CANON.map((c) => ({
  bookId: c.id,
  displayName: PT[c.id] ?? c.english,
  aliases: [],
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
});
