// Regras do Analisador de congregações (ferramenta avulsa em public/ferramentas, fora do app).
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { status: string; appt: string; baptism: string; area: string; months: Month[] };
type Item = { name: string; detail: string; months?: string[] };
type Result = { months: string[]; counts: Record<string, number>; lists: Record<string, Item[]> };

const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = (an && "analyze" in an ? an : g["Analisador"]) as {
  analyze: (c: Card[], o: { from: string; to: string; studyRule?: string; area?: string }) => Result;
  defaultPeriod: (c: Card[]) => { from: string; to: string };
};
const S21 = g["S21"] as { fromFields: (f: Record<string, unknown>, file?: string) => Card };

/** Cartão do ano 2025/2026 (set/2025–ago/2026). months: índice 0 = setembro. */
function card(name: string, opts: { year?: string; rp?: boolean; elder?: boolean; baptism?: string; area?: string; months?: Record<number, Partial<Month>> } = {}): Card {
  const p = S21.fromFields({
    "900_1_Text_SanSerif": name, "900_2_Text_SanSerif": "01/01/1990", "900_3_CheckBox": true,
    "900_5_Text_SanSerif": opts.baptism ?? "01/01/2010", "900_13_Text_C_SanSerif": opts.year ?? "2025/2026",
    "900_10_CheckBox": !!opts.rp, "900_8_CheckBox": !!opts.elder,
  }, "x.pdf");
  if (opts.baptism === "") p.status = "Unbaptized Publisher";
  p.area = opts.area ?? "g1";
  Object.entries(opts.months ?? {}).forEach(([i, m]) => Object.assign(p.months[Number(i)]!, m));
  return p;
}
const all = (extra: Record<number, Partial<Month>> = {}) => {
  const m: Record<number, Partial<Month>> = {};
  for (let i = 0; i < 12; i++) m[i] = { participated: true };
  return { ...m, ...extra };
};
const P = { from: "2026-03", to: "2026-08" };

describe("Analisador de congregações", () => {
  it("período padrão: os 6 últimos meses com relatório", () => {
    expect(A.defaultPeriod([card("Ana Lima", { months: all() })])).toEqual({ from: "2026-03", to: "2026-08" });
  });

  it("pioneiros auxiliares diferentes: a mesma pessoa conta uma vez", () => {
    const r = A.analyze([card("Ana Lima", { months: all({ 6: { auxiliary: true, hours: 30 }, 8: { auxiliary: true, hours: 30 } }) })], P);
    expect(r.counts["aux"]).toBe(1);
    expect(r.lists["aux"]?.[0]?.months).toEqual(["2026-03", "2026-05"]);
  });

  it("anciãos e servos que serviram como P.A.", () => {
    const r = A.analyze([card("João Dias", { elder: true, months: all({ 7: { auxiliary: true } }) }), card("Ana Lima", { months: all({ 7: { auxiliary: true } }) })], P);
    expect(r.counts["apptAux"]).toBe(1);
    expect(r.lists["apptAux"]?.[0]?.name).toBe("João Dias");
  });

  it("novos batizados: batismo dentro do período", () => {
    const r = A.analyze([card("Ana Lima", { baptism: "15/04/2026", months: all() }), card("Rui Melo", { baptism: "15/01/2026", months: all() })], P);
    expect(r.counts["newBap"]).toBe(1);
    expect(r.lists["newBap"]?.[0]?.name).toBe("Ana Lima");
  });

  it("irregulares: pelo menos um mês sem o tique de pregar", () => {
    const r = A.analyze([card("Ana Lima", { months: all({ 7: { participated: false } }) }), card("Rui Melo", { months: all() })], P);
    expect(r.counts["irregular"]).toBe(1);
    expect(r.lists["irregular"]?.[0]?.months).toEqual(["2026-04"]);
  });

  it("novo publicador não batizado: meses antes de começar não contam como irregular", () => {
    const r = A.analyze([card("Leo Reis", { baptism: "", months: { 8: { participated: true }, 9: { participated: true }, 10: { participated: true }, 11: { participated: true } } }), card("Rui Melo", { months: all() })], P);
    expect(r.counts["newUnbap"]).toBe(1);
    expect(r.counts["unbap"]).toBe(1);
    expect(r.lists["irregular"]).toHaveLength(0);
  });

  it("novo publicador não batizado pela observação", () => {
    const r = A.analyze([card("Leo Reis", { baptism: "", months: all({ 0: { comments: "Novo publicador" } }) })], P);
    expect(r.counts["newUnbap"]).toBe(1);
  });

  it("dirigem estudos: as três regras", () => {
    // estudos em mar, mai e ago (alternados)
    const alt = card("Ana Lima", { months: all({ 6: { studies: 1 }, 8: { studies: 1 }, 11: { studies: 2 } }) });
    // estudos só em jun, jul e ago (seguidos no fim)
    const end3 = card("Rui Melo", { months: all({ 9: { studies: 1 }, 10: { studies: 1 }, 11: { studies: 1 } }) });
    // estudos só em março
    const once = card("Leo Reis", { months: all({ 6: { studies: 1 } }) });
    const names = (rule: string) => A.analyze([alt, end3, once], { ...P, studyRule: rule }).lists["studies"]?.map((i) => i.name);
    expect(names("last")).toEqual(["Ana Lima", "Rui Melo"]);
    expect(names("last3")).toEqual(["Rui Melo"]);
    expect(names("any3")).toEqual(["Ana Lima", "Rui Melo"]);
  });

  it("pioneiros regulares abaixo de 50 horas no mês", () => {
    const r = A.analyze([card("Ana Lima", { rp: true, area: "rp", months: all(Object.fromEntries([6, 7, 8, 9, 10, 11].map((i) => [i, { hours: i === 8 ? 42 : 50 }]))) })], P);
    expect(r.counts["rpLow"]).toBe(1);
    expect(r.lists["rpLow"]?.[0]?.detail).toBe("Mai 2026: 42 h");
  });

  it("dois anos de serviço da mesma pessoa viram uma pessoa só", () => {
    const a = card("Ana Lima", { year: "24/25", months: all() });
    const b = card("Ana Lima", { year: "25/26", months: all({ 11: { participated: false } }) });
    const other = card("Rui Melo", { months: all() }); // agosto já tem relatório na congregação
    const r = A.analyze([a, b, other], { from: "2025-06", to: "2026-08", area: "all" });
    expect(r.counts["bap"]).toBe(2);
    expect(r.lists["irregular"]).toHaveLength(1);
    expect(r.lists["irregular"]?.[0]?.months).toEqual(["2026-08"]);
  });

  it("resumo por grupo conta só as pessoas daquele grupo", () => {
    const cards = [card("Ana Lima", { area: "g1", months: all() }), card("Rui Melo", { area: "g2", elder: true, months: all() })];
    expect(A.analyze(cards, { ...P, area: "g2" }).counts["elder"]).toBe(1);
    expect(A.analyze(cards, { ...P, area: "g1" }).counts["elder"]).toBe(0);
    expect(A.analyze(cards, { ...P, area: "all" }).counts["bap"]).toBe(2);
  });
});
