// Analisador: datas em qualquer formato, inativos/perigo e meses abaixo de 50 h dos pioneiros.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { id?: string; status: string; area: string; months: Month[] };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = (an && "analyze" in an ? an : g["Analisador"]) as {
  parseDateAny: (v: string, now?: Date) => string;
  inactiveMap: (c: Card[]) => Record<string, { inactive: boolean; risk: boolean; streak: number }>;
  folderGroups: (i: { path: string }[]) => { key: string; inactive?: boolean }[];
  pioneerYear: (c: Card[], y: number) => { list: { low: { month: string; hours: number | null; comments: string }[] }[] };
};
const S21 = g["S21"] as { fromFields: (f: Record<string, unknown>, file?: string) => Card };

let n = 0;
function card(name: string, preached: boolean[], o: { rp?: boolean; hours?: (number | null)[]; comments?: string[] } = {}): Card {
  const p = S21.fromFields({ "900_1_Text_SanSerif": name, "900_5_Text_SanSerif": "01/01/2010", "900_13_Text_C_SanSerif": "2025/2026", "900_10_CheckBox": !!o.rp }, "x.pdf");
  p.id = "c" + ++n; p.area = "g1";
  preached.forEach((v, i) => Object.assign(p.months[i]!, { participated: v, studies: v ? 0 : null, hours: o.hours?.[i] ?? null, comments: o.comments?.[i] ?? "" }));
  return p;
}
const now = new Date(Date.UTC(2026, 10, 24));

describe("Analisador — datas", () => {
  it("reconhece data por extenso", () => expect(A.parseDateAny("06 DE MAIO DE 1986")).toBe("1986-05-06"));
  it("reconhece dd/mm/aaaa e ano com 2 dígitos", () => {
    expect(A.parseDateAny("6/5/1986")).toBe("1986-05-06");
    expect(A.parseDateAny("06-05-86", now)).toBe("1986-05-06");
    expect(A.parseDateAny("06.05.20", now)).toBe("2020-05-06");
  });
  it("reconhece abreviado e ISO", () => {
    expect(A.parseDateAny("6 de mar. 1990")).toBe("1990-03-06");
    expect(A.parseDateAny("1986-05-06")).toBe("1986-05-06");
  });
  it("data impossível fica vazia", () => expect(A.parseDateAny("31/02/2000")).toBe(""));
});

describe("Analisador — inativos", () => {
  const all = Array(12).fill(true) as boolean[];
  it("6 meses seguidos sem pregar = inativo", () => {
    const base = card("Base Um", all);
    const c = card("Ana Seis", [true, true, true, true, true, true, false, false, false, false, false, false]);
    expect(A.inactiveMap([base, c])[c.id!]!.inactive).toBe(true);
  });
  it("4 ou 5 meses = perigo, não inativo", () => {
    const base = card("Base Um", all);
    const c = card("Bia Quatro", [true, true, true, true, true, true, true, true, false, false, false, false]);
    const i = A.inactiveMap([base, c])[c.id!]!;
    expect(i.inactive).toBe(false); expect(i.risk).toBe(true); expect(i.streak).toBe(4);
  });
  it("3 meses não gera alerta", () => {
    const base = card("Base Um", all);
    const c = card("Caio Tres", [...Array(9).fill(true), false, false, false] as boolean[]);
    expect(A.inactiveMap([base, c])[c.id!]!.risk).toBe(false);
  });
  it("palavra inativo no cartão = inativo", () => {
    const c = card("Davi Obs", all, { comments: ["", "Inativo desde 2024"] });
    expect(A.inactiveMap([c])[c.id!]!.inactive).toBe(true);
  });
  it("pasta Inativos vira grupo de inativos", () => {
    const gs = A.folderGroups([{ path: "Cong/Inativos/a.pdf" }, { path: "Cong/Grupo 1/b.pdf" }]);
    expect(gs.find((x) => x.key === "in")?.inactive).toBe(true);
  });
});

describe("Analisador — meta: meses abaixo de 50 h", () => {
  it("lista mês, horas e observação", () => {
    const c = card("Eva Pio", Array(12).fill(true) as boolean[], { rp: true, hours: [60, 42, 55, 50, 50, 50, 50, 50, 50, 50, 50, 50], comments: ["", "doente"] });
    const low = A.pioneerYear([c], 2026).list[0]!.low;
    expect(low).toEqual([{ month: "2025-10", hours: 42, comments: "doente" }]);
  });
});
