// Início do PR = primeiro mês com horas sem auxiliar/especial/missionário; alerta do ano anterior no ano atual.
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

type Month = { participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { id?: string; area: string; months: Month[] };
type Goal = { start: string; late: boolean; shortYear: boolean; missing: number; goalYear: number; prevMissing: number; prevLow: { month: string; hours: number | null }[] };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = (an && "analyze" in an ? an : g["Analisador"]) as { setToday: (d: Date | null) => void; pioneerYear: (c: Card[], y: number) => { list: Goal[] }; analyzeRp: (c: Card[], o: { from: string; to: string }, y: number) => { counts: Record<string, number>; lists: Record<string, { name: string; detail: string }[]> } };
const S21 = g["S21"] as { fromFields: (f: Record<string, unknown>, file?: string) => Card };

let n = 0;
function card(name: string, year: string, hours: (number | null)[], extra: Partial<Month>[] = []): Card {
  const p = S21.fromFields({ "900_1_Text_SanSerif": name, "900_5_Text_SanSerif": "01/01/2010", "900_13_Text_C_SanSerif": year, "900_10_CheckBox": true }, "x.pdf");
  p.id = "p" + ++n; p.area = "rp";
  hours.forEach((h, i) => Object.assign(p.months[i]!, { participated: h != null, studies: 0, hours: h }, extra[i] || {}));
  return p;
}
afterEach(() => A.setToday(null));
const today = () => A.setToday(new Date(2026, 10, 15));

describe("início do pioneiro regular", () => {
  it("mês como auxiliar não conta; início no mês seguinte com horas", () => {
    today();
    const x = A.pioneerYear([card("Ana", "2025/2026", [30, ...Array(11).fill(50)], [{ auxiliary: true }])], 2026).list[0]!;
    expect(x.start).toBe("2025-10");
    expect(x.goalYear).toBe(550);
    expect(x.shortYear).toBe(false);
  });
  it("observação de pioneiro especial ou missionário não conta", () => {
    today();
    const x = A.pioneerYear([card("Bia", "2025/2026", [70, 70, ...Array(10).fill(50)], [{ comments: "Pioneiro especial" }, { comments: "missionário em campo" }])], 2026).list[0]!;
    expect(x.start).toBe("2025-11");
  });
  it("0 h depois de começar em setembro continua contando: ano completo com alerta", () => {
    today();
    const x = A.pioneerYear([card("Caio", "2025/2026", [55, 0, ...Array(10).fill(50)])], 2026).list[0]!;
    expect(x.start).toBe("2025-09");
    expect(x.shortYear).toBe(true);
    expect(x.missing).toBe(45);
  });
  it("alerta do ano anterior aparece no ano atual com os meses abaixo de 50 h", () => {
    today();
    const old = card("Dora", "2025/2026", [50, 40, ...Array(10).fill(50)]);
    const cur = card("Dora", "2026/2027", [50, 50]);
    const x = A.pioneerYear([old, cur], 2027).list[0]!;
    expect(x.prevMissing).toBe(10);
    expect(x.prevLow).toEqual([expect.objectContaining({ month: "2025-10", hours: 40 })]);
  });
  it("Regina: 573 h em 2026 → novo cartão do Resumo no ano 2027 com 6 meses", () => {
    today();
    const old = card("Regina Ventura", "2025/2026", [64, 39, 25, 39, 61, 39, 38, 61, 43, 64, 41, 59]);
    const cur = card("Regina Ventura", "2026/2027", [61, 36]);
    const r = A.analyzeRp([old, cur], { from: "2026-05", to: "2026-10" }, 2027);
    expect(r.counts["short600"]).toBe(1);
    expect(r.lists["short600"]![0]!.detail).toBe("Faltou 27 h");
  });
});
