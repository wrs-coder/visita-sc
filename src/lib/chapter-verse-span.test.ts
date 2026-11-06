import { describe, it, expect } from "vitest";
import { chapterVerseSpan } from "./bible-reader-settings";

describe("topo do leitor com intervalo de versículos", () => {
  it("Gênesis 1 com 31 versículos → :1-31", () => {
    expect(chapterVerseSpan(Array.from({ length: 31 }, (_, i) => ({ verse: i + 1 })))).toBe(":1-31");
  });
  it("sem versículos carregados → vazio", () => {
    expect(chapterVerseSpan(null)).toBe("");
    expect(chapterVerseSpan([])).toBe("");
  });
});
