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
  inactiveMap: (c: Card[], upTo?: string, ov?: Record<string, boolean>) => Record<string, { inactive: boolean; risk: boolean; streak: number; key: string; flagNote: string }>;
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
const F = false, T = true;
// cartão 2025/2026: índice 0 = set/2025 ... 11 = ago/2026
describe("Analisador — regra de inativos pelo período", () => {
  it("pregou no último mês do período não é inativo, mesmo com 'inativo' no cartão", () => {
    const c = card("Ana Reg", [T, F, F, F, F, F, F, F, F, F, F, T], { comments: ["Inativo"] });
    const i = A.inactiveMap([c], "2026-08")[c.id!]!;
    expect(i.inactive).toBe(false);
    expect(i.flagNote).not.toBe("");
  });
  it("6 meses seguidos sem pregar até o fim do período é inativo", () => {
    const c = card("Bia Reg", [T, T, T, T, T, T, F, F, F, F, F, F]);
    expect(A.inactiveMap([c], "2026-08")[c.id!]!.inactive).toBe(true);
  });
  it("5 meses é perigo, não inativo", () => {
    const c = card("Caio Reg", [T, T, T, T, T, T, T, F, F, F, F, F]);
    const i = A.inactiveMap([c], "2026-08")[c.id!]!;
    expect(i.inactive).toBe(false); expect(i.risk).toBe(true);
  });
  it("meses sem pregar depois do fim do período não contam", () => {
    const c = card("Davi Reg", [T, T, T, T, T, T, F, F, F, F, F, F]);
    expect(A.inactiveMap([c], "2026-02")[c.id!]!.inactive).toBe(false);
  });
  it("opção 'Não está inativo' impede inativo", () => {
    const c = card("Eva Reg", [T, F, F, F, F, F, F, F, F, F, F, F]);
    const key = A.inactiveMap([c], "2026-08")[c.id!]!.key;
    expect(A.inactiveMap([c], "2026-08", { [key]: true })[c.id!]!.inactive).toBe(false);
  });
});
