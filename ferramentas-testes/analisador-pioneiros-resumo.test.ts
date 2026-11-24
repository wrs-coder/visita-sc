// Analisador: resumo próprio dos pioneiros regulares e contagem por pessoas.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { status: string; area: string; appt: string; months: Month[] };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = (an && "analyze" in an ? an : g["Analisador"]) as {
  RP_TILES: { key: string }[];
  people: (c: Card[]) => unknown[];
  analyzeRp: (c: Card[], o: { from: string; to: string }, y: number) => { counts: Record<string, number>; lists: Record<string, { name: string }[]> };
};
const S21 = g["S21"] as { fromFields: (f: Record<string, unknown>, file?: string) => Card };

function card(name: string, year: string, o: { appt?: string; m?: Record<number, Partial<Month>> } = {}): Card {
  const p = S21.fromFields({ "900_1_Text_SanSerif": name, "900_5_Text_SanSerif": "01/01/2010", "900_13_Text_C_SanSerif": year, "900_10_CheckBox": true }, "x.pdf");
  p.area = "rp"; if (o.appt) p.appt = o.appt;
  Object.entries(o.m ?? {}).forEach(([i, v]) => Object.assign(p.months[Number(i)]!, v));
  return p;
}
const full = (h: number) => { const m: Record<number, Partial<Month>> = {}; for (let i = 0; i < 12; i++) m[i] = { participated: true, hours: h }; return m; };

describe("Analisador — resumo dos pioneiros regulares", () => {
  it("só os 5 cards pedidos", () => {
    expect(A.RP_TILES.map((t) => t.key)).toEqual(["elderRp", "msRp", "studies", "irregular", "below"]);
  });
  it("anciãos/servos pioneiros e abaixo da média", () => {
    const cards = [card("Ana Reg", "2025/2026", { appt: "Elder", m: full(40) }), card("Beto Reg", "2025/2026", { appt: "MS", m: full(60) })];
    const r = A.analyzeRp(cards, { from: "2025-09", to: "2026-08" }, 2026);
    expect([r.counts["elderRp"], r.counts["msRp"], r.counts["below"]]).toEqual([1, 1, 1]);
    expect(r.lists["below"]!.map((x) => x.name)).toEqual(["Ana Reg"]);
  });
  it("dois cartões da mesma pessoa contam como 1 pessoa", () => {
    expect(A.people([card("Ana Reg", "2025/2026"), card("Ana Reg", "2026/2027")]).length).toBe(1);
  });
});
