// Analisador: mês atual do aparelho nunca é avaliado; 6 meses = meses anteriores; alerta das 600 h; grupos no arquivo Circuit Manager.
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { id?: string; status: string; area: string; months: Month[] };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
type Goal = { name: string; shortYear: boolean; missing: number; low: { month: string }[] };
const A = (an && "analyze" in an ? an : g["Analisador"]) as {
  setToday: (d: Date | null) => void;
  inactiveMap: (c: Card[], upTo?: string) => Record<string, { inactive: boolean }>;
  analyze: (c: Card[], o: { from: string; to: string }) => { lists: { irregular: unknown[] } };
  lastMonths: (c: Card[], n: number) => { from: string; to: string };
  pioneerYear: (c: Card[], y: number) => { list: Goal[] };
};
const S21 = g["S21"] as {
  fromFields: (f: Record<string, unknown>, file?: string) => Card;
  toCircuit: (l: Card[], o: Record<string, unknown>) => { publishers: { group_id: number | null }[]; fsGroups: { id: number; name: string }[] };
};

let n = 0;
function card(name: string, year: string, preached: boolean[], o: { rp?: boolean; hours?: (number | null)[] } = {}): Card {
  const p = S21.fromFields({ "900_1_Text_SanSerif": name, "900_5_Text_SanSerif": "01/01/2010", "900_13_Text_C_SanSerif": year, "900_10_CheckBox": !!o.rp }, "x.pdf");
  p.id = "m" + ++n; p.area = "g1";
  preached.forEach((v, i) => Object.assign(p.months[i]!, { participated: v, studies: v ? 0 : null, hours: o.hours?.[i] ?? null }));
  return p;
}
const T = true, F = false;
afterEach(() => A.setToday(null));

describe("mês atual do aparelho", () => {
  it("Ano 2027 em novembro/2026: quem pregou até outubro não fica inativo nem irregular", () => {
    A.setToday(new Date(2026, 10, 15));
    const old = card("Ana Lima", "2025/2026", Array(12).fill(T));
    const cur = card("Ana Lima", "2026/2027", [T, T]); // set, out/2026; resto em branco
    const map = A.inactiveMap([old, cur], "2027-08");
    expect(map[cur.id!]!.inactive).toBe(false);
    expect(A.analyze([old, cur], { from: "2026-09", to: "2027-08" }).lists.irregular.length).toBe(0);
  });
  it("relatório de novembro (mês atual) é ignorado", () => {
    A.setToday(new Date(2026, 10, 15));
    const cur = card("Rui Dias", "2026/2027", [T, T, F]);
    expect(A.analyze([cur], { from: "2026-09", to: "2027-08" }).lists.irregular.length).toBe(0);
  });
  it("6 meses em novembro/2026 = maio a outubro/2026", () => {
    A.setToday(new Date(2026, 10, 15));
    const cards = [card("Eva Reis", "2025/2026", Array(12).fill(T)), card("Eva Reis", "2026/2027", [T, T])];
    expect(A.lastMonths(cards, 6)).toEqual({ from: "2026-05", to: "2026-10" });
  });
});

describe("meta 600 h no ano completo", () => {
  const h = (v: number) => Array(12).fill(v) as number[];
  it("ano completo com 540 h → (Ano anterior faltou: 60 h) e meses abaixo de 50 h", () => {
    A.setToday(new Date(2026, 10, 15));
    const x = A.pioneerYear([card("Maria Souza", "2025/2026", Array(12).fill(T), { rp: true, hours: h(45) })], 2026).list[0]!;
    expect(x.shortYear).toBe(true);
    expect(x.missing).toBe(60);
    expect(x.low.length).toBe(12);
  });
  it("600 h → sem alerta", () => {
    A.setToday(new Date(2026, 10, 15));
    expect(A.pioneerYear([card("Joana Paz", "2025/2026", Array(12).fill(T), { rp: true, hours: h(50) })], 2026).list[0]!.shortYear).toBe(false);
  });
  it("ano em andamento → sem alerta", () => {
    A.setToday(new Date(2026, 3, 15));
    expect(A.pioneerYear([card("Lia Rosa", "2025/2026", Array(12).fill(T), { rp: true, hours: h(40) })], 2026).list[0]!.shortYear).toBe(false);
  });
});

describe("arquivo Circuit Manager com grupos", () => {
  it("cada publicador recebe o grupo e fsGroups lista os grupos", () => {
    const a = card("Paulo Neto", "2025/2026", [T]); const b = card("Caio Melo", "2025/2026", [T]); b.area = "g2";
    const out = S21.toCircuit([a, b], { name: "Centro", number: "123", country: "BR", today: new Date(2026, 10, 15), groupOf: (p: Card) => (p.area === "g1" ? "Grupo 1" : "Grupo 2") });
    expect(out.fsGroups.map((x) => x.name)).toEqual(["Grupo 1", "Grupo 2"]);
    expect(out.publishers.every((p) => p.group_id !== null)).toBe(true);
  });
  it("sem groupOf (Conversor S-21) continua sem grupos", () => {
    const out = S21.toCircuit([card("Paulo Neto", "2025/2026", [T])], { today: new Date(2026, 10, 15) });
    expect(out.fsGroups).toEqual([]);
    expect(out.publishers[0]!.group_id).toBeNull();
  });
});
