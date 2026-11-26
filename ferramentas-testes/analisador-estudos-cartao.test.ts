// Analisador: mês sem cartão nunca conta como "sem estudos"; aviso ao trocar cartão do mesmo ano por um com menos meses.
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { id?: string; area: string; months: Month[] };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
type Item = { name: string; detail: string };
const A = (an && "analyze" in an ? an : g["Analisador"]) as {
  setToday: (d: Date | null) => void;
  analyze: (c: Card[], o: { from: string; to: string; studyRule?: string }) => { lists: Record<string, Item[]> };
  replaceWarning: (a: Card, b: Card) => string;
};
const S21 = g["S21"] as { fromFields: (f: Record<string, unknown>, file?: string) => Card };
let n = 0;
function card(name: string, year: string, studies: (number | null)[], elder = true): Card {
  const p = S21.fromFields({ "900_1_Text_SanSerif": name, "900_2_Text_SanSerif": "01/01/1960", "900_5_Text_SanSerif": "01/01/1980", "900_13_Text_C_SanSerif": year, "900_8_CheckBox": elder }, "x.pdf");
  p.id = "e" + ++n; p.area = "g1";
  studies.forEach((v, i) => { if (v != null) Object.assign(p.months[i]!, { participated: true, studies: v }); });
  return p;
}
afterEach(() => A.setToday(null));

describe("estudos com cartão faltando", () => {
  it("caso Waldir: sem cartão 2025/2026, estudos em set e out/2026 não o colocam em 'sem estudos'", () => {
    A.setToday(new Date(2026, 10, 26));
    const old = card("Waldir Marques", "2024/2025", [3, 3, 3, 3, 2, 5, 3, 4, 3, 3, null, null]);
    const cur = card("Waldir Marques", "2026/2027", [3, 4]);
    const other = card("Outro Irmao", "2025/2026", Array(12).fill(1), false);
    const r = A.analyze([old, cur, other], { from: "2026-05", to: "2026-10", studyRule: "last3" });
    expect(r.lists["apptNoStudies"]?.map(x => x.name)).toEqual([]);
    expect(A.analyze([old, cur, other], { from: "2026-05", to: "2026-10", studyRule: "last" }).lists["apptNoStudies"]).toEqual([]);
  });
  it("quem realmente não dirigiu continua na lista e mostra os meses sem cartão", () => {
    A.setToday(new Date(2026, 10, 26));
    const cur = card("Joao Sem", "2026/2027", [0, 0]);
    const other = card("Outro Irmao", "2025/2026", Array(12).fill(1), false);
    const it = A.analyze([cur, other], { from: "2026-05", to: "2026-10", studyRule: "last3" }).lists["apptNoStudies"]?.[0];
    expect(it?.name).toBe("Joao Sem");
    expect(it?.detail).toContain("Faltam dados: ");
  });
});

describe("troca de cartão na importação", () => {
  it("avisa quando o novo cartão do mesmo ano tem menos meses preenchidos", () => {
    const full = card("Engracia Bernardo", "2025/2026", Array(12).fill(1), false);
    const one = card("Engracia Bernardo", "2025/2026", [1], false);
    expect(A.replaceWarning(full, one)).toContain("12 → 1");
    expect(A.replaceWarning(one, full)).toBe("");
  });
});
