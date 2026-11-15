import { describe, expect, it } from "vitest";
import { citationRanges, findInText, foldForSearch, touchesCitation } from "./note-search";
import { countWords, speakingMinutes } from "./word-counter";

describe("localizar no esboço", () => {
  it("acha sem diferenciar maiúsculas nem acentos, nas posições certas", () => {
    const text = "Jeová ama. JEOVA cuida. jeova guia.";
    expect(findInText(text, "jeova")).toEqual([
      { start: 0, end: 5 },
      { start: 11, end: 16 },
      { start: 24, end: 29 },
    ]);
    expect(foldForSearch("Ação")).toHaveLength(4);
  });
  it("termo vazio não acha nada", () => {
    expect(findInText("abc", "  ")).toEqual([]);
  });
  it("avisa quando a troca atinge uma citação bíblica", () => {
    const text = "Leia João 3:16 com ele.";
    const cites = citationRanges(text);
    const joao = findInText(text, "João")[0];
    const ele = findInText(text, "ele")[0];
    expect(touchesCitation(joao, cites)).toBe(true);
    expect(touchesCitation(ele, cites)).toBe(false);
  });
});

describe("contador de palavras e tempo de fala", () => {
  it("conta palavras e números, ignora pontuação solta", () => {
    expect(countWords("Leia João 3:16 — e Salmo 23.")).toBe(7);
    expect(countWords("")).toBe(0);
  });
  it("estima a 130 palavras por minuto", () => {
    expect(speakingMinutes(1450)).toBe(11);
    expect(speakingMinutes(130)).toBe(1);
    expect(speakingMinutes(10)).toBe(1);
    expect(speakingMinutes(0)).toBe(0);
  });
});
