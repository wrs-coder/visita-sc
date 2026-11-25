import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = { id: string; area: string; status: string; special: string; appt: string; months: Month[]; notes: string[] };
type Item = { id: string; name: string };
type Result = { counts: Record<string, number>; lists: Record<string, Item[]> };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
const S = ("fromFields" in conv ? conv : g["S21"]) as {
  fromFields: (f: Record<string, unknown>) => Card;
  toCircuit: (c: Card[]) => { publishers: { status: string }[]; reports: { minutes: number }[] };
};
g["S21"] = S;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = ("analyze" in an ? an : g["Analisador"]) as {
  TILES: { key: string }[]; RP_TILES: { key: string }[];
  statusOf: (p: Card) => string; setStatus: (p: Card, s: string) => Card;
  analyze: (c: Card[], o: { from: string; to: string; studyRule?: string; area?: string }) => Result;
  analyzeRp: (c: Card[], o: { from: string; to: string }, y: number) => Result;
  pioneerYear: (c: Card[], y: number) => { list: Item[] };
  exportTiles: (t: { key: string }[], o: { apptNoStudies: boolean }) => { key: string }[];
  setToday: (d: Date | null) => void;
};
const period = { from: "2026-05", to: "2026-10" };
function card(id: string, appt = "", fields: Record<string, unknown> = {}): Card {
  const p = S.fromFields({ "900_1_Text_SanSerif": id + " Silva", "900_5_Text_SanSerif": "01/01/2010", "900_13_Text_C_SanSerif": "2026/2027", ...fields });
  p.id = id; p.area = "g1"; p.appt = appt;
  p.months.forEach((m, i) => { if (i < 2) { m.participated = true; m.studies = 0; } });
  return p;
}
afterEach(() => A.setToday(null));
describe("Analisador — situações S-21", () => {
  it.each([["900_11_CheckBox", "Special Pioneer"], ["900_12_CheckBox", "FieldMissionary"]])("reconhece %s importado sem perder horas ou o formato de exportação", (field, status) => {
    const p = card("Ana", "", { [field]: true, "904_20_S21_Value": "80" });
    expect(A.statusOf(p)).toBe(status);
    expect(S.toCircuit([p]).publishers[0]?.status).toBe(status);
    expect(S.toCircuit([p]).reports[0]?.minutes).toBe(4800);
    expect(A.pioneerYear([p], 2027).list).toEqual([]);
  });
  it("permite editar especial e missionário e voltar a PR sem marcador residual", () => {
    const p = card("Ana");
    A.setStatus(p, "Special Pioneer"); expect(A.statusOf(p)).toBe("Special Pioneer");
    A.setStatus(p, "FieldMissionary"); expect(S.toCircuit([p]).publishers[0]?.status).toBe("FieldMissionary");
    A.setStatus(p, "Regular Pioneer"); expect(p.special).toBe(""); expect(A.statusOf(p)).toBe("Regular Pioneer");
  });
});
describe("Analisador — pessoas de cada indicador", () => {
  it("contagem e lista correspondem para todos os indicadores gerais", () => {
    const a = card("Antonio", "Elder"), b = card("Bruno", "MS"), c = card("Carla", "", { "900_5_Text_SanSerif": "" });
    const r = A.analyze([a, b, c], period);
    expect(r.lists["elder"]?.map(x => x.id)).toEqual(["Antonio"]);
    expect(r.lists["ms"]?.map(x => x.id)).toEqual(["Bruno"]);
    expect(r.lists["bap"]?.map(x => x.id)).toEqual(["Antonio", "Bruno"]);
    expect(r.lists["unbap"]?.map(x => x.id)).toEqual(["Carla"]);
    for (const t of A.TILES) expect(r.lists[t.key]?.length).toBe(r.counts[t.key]);
  });
  it("pioneiros designados têm lista com identificadores do cartão", () => {
    const p = card("Antonio", "Elder", { "900_10_CheckBox": true }); p.area = "rp";
    const r = A.analyzeRp([p], period, 2027);
    expect(r.lists["elderRp"]?.map(x => x.id)).toEqual(["Antonio"]);
    for (const t of A.RP_TILES) expect(r.lists[t.key]?.length).toBe(r.counts[t.key]);
  });
  it("designados sem estudos seguem o critério selecionado e o grupo", () => {
    A.setToday(new Date(2026, 10, 25));
    const a = card("Antonio", "Elder"), b = card("Bruno", "MS"), c = card("Carla");
    const m = b.months[1]; if (m) m.studies = 1;
    expect(A.analyze([a, b, c], { ...period, studyRule: "last" }).lists["apptNoStudies"]?.map(x => x.id)).toEqual(["Antonio"]);
    expect(A.analyze([a, b, c], { ...period, studyRule: "last3" }).lists["apptNoStudies"]?.map(x => x.id)).toEqual(["Antonio", "Bruno"]);
    expect(A.analyze([a, b, c], { ...period, studyRule: "any3" }).counts["apptNoStudies"]).toBe(2);
    a.area = "g2";
    expect(A.analyze([a, b], { ...period, area: "g1" }).counts["apptNoStudies"]).toBe(0);
  });
  it("sem meses avaliáveis não conclui que um designado não dirige estudos", () => {
    expect(A.analyze([card("Antonio", "Elder")], { from: "2025-01", to: "2025-02" }).counts["apptNoStudies"]).toBe(0);
  });
  it("oculta o indicador em ambas as famílias de PDF sem alterar os dados", () => {
    for (const tiles of [A.TILES, A.RP_TILES]) {
      expect(A.exportTiles(tiles, { apptNoStudies: false }).some(t => t.key === "apptNoStudies")).toBe(false);
      expect(A.exportTiles(tiles, { apptNoStudies: true }).some(t => t.key === "apptNoStudies")).toBe(true);
      expect(tiles.some(t => t.key === "apptNoStudies")).toBe(true);
    }
  });
});