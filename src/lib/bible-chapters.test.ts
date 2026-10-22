import { describe, it, expect } from "vitest";
import { TOTAL_CHAPTERS, bookOrder, yearPlanDay, filterHighlights, chapterSequence } from "./bible-chapters";
import { sanitizeWs } from "./guest-workspace-store";

describe("leitura da Bíblia", () => {
  it("conta 1.189 capítulos e 66 livros em cada ordem", () => {
    expect(TOTAL_CHAPTERS).toBe(1189);
    expect(new Set(bookOrder("chrono")).size).toBe(66);
    expect(chapterSequence("chrono")).toHaveLength(1189);
  });
  it("plano anual: dia 1 começa em Gênesis 1, dia 365 termina em Apocalipse 22", () => {
    expect(yearPlanDay("2026-01-01", new Date(2026, 0, 1)).keys[0]).toBe("B01:1");
    const last = yearPlanDay("2026-01-01", new Date(2026, 11, 31)).keys;
    expect(last[last.length - 1]).toBe("B66:22");
  });
  it("descarta capítulo inexistente e plano desconhecido", () => {
    const d = sanitizeWs({ reading: { plan: "hack", done: ["B19:150", "B19:151", "xx"] } });
    expect(d.reading.plan).toBe("canon");
    expect(d.reading.done).toEqual(["B19:150"]);
  });
  it("filtra pontos altos por livro e por texto", () => {
    const hs = [
      { id: "1", ref: "Salmo 23:1", bookId: "B19", text: "pastor", date: "2026" },
      { id: "2", ref: "João 3:16", bookId: "B43", text: "amor", date: "2026" },
    ];
    expect(filterHighlights(hs, "B19", "").map((h) => h.id)).toEqual(["1"]);
    expect(filterHighlights(hs, null, "AMOR").map((h) => h.id)).toEqual(["2"]);
  });
});
