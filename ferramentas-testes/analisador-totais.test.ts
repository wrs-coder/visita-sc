// Analisador: ordem dos grupos, totais mensais, meta anual dos pioneiros e importação .json/.xml.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Card = Record<string, unknown> & { status: string; area: string; months: Month[] };
type Grp = { name: string | null; rp: boolean; cards: Card[] };
const req = createRequire(import.meta.url);
const g = globalThis as Record<string, unknown>;
const conv = req("../public/ferramentas/S21_Export/converter.js") as Record<string, unknown>;
if (conv && "groupPeople" in conv) g["S21"] = conv;
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = (an && "analyze" in an ? an : g["Analisador"]) as {
  TILES: { key: string }[];
  sortGroups: (x: { name: string }[]) => { name: string }[];
  monthlyTotals: (c: Card[], o: { from: string; to: string; area?: string }) => { months: string[]; rows: Record<string, Record<string, number>> };
  pioneerYear: (c: Card[], y: number, upTo?: string) => { list: { name: string; diff: number; goalYear: number; goalNow: number; need: number }[] };
  fromCircuitJson: (d: unknown, f: string) => { groups: Grp[] };
  fromTswinXml: (t: string, f: string) => { groups: Grp[] };
};
const S21 = g["S21"] as { fromFields: (f: Record<string, unknown>, file?: string) => Card };

function card(name: string, o: { rp?: boolean; area?: string; m?: Record<number, Partial<Month>> } = {}): Card {
  const p = S21.fromFields({ "900_1_Text_SanSerif": name, "900_5_Text_SanSerif": "01/01/2010", "900_13_Text_C_SanSerif": "2025/2026", "900_10_CheckBox": !!o.rp }, "x.pdf");
  p.area = o.area ?? "g1";
  Object.entries(o.m ?? {}).forEach(([i, v]) => Object.assign(p.months[Number(i)]!, v));
  return p;
}

describe("Analisador — ajustes", () => {
  it("grupos em ordem crescente natural", () => {
    expect(A.sortGroups([{ name: "Grupo 10" }, { name: "Grupo 2" }, { name: "Grupo 1" }]).map((x) => x.name)).toEqual(["Grupo 1", "Grupo 2", "Grupo 10"]);
  });
  it("resumo dos grupos sem o cartão de pioneiros abaixo de 50 h", () => {
    expect(A.TILES.some((t) => t.key === "rpLow")).toBe(false);
  });
  it("totais de agosto por tipo", () => {
    const cards = [
      card("Ana Pub", { m: { 11: { participated: true, studies: 2 } } }),
      card("Beto Pub", { m: { 11: { participated: false } } }),
      card("Caio Aux", { m: { 11: { participated: true, auxiliary: true, hours: 30, studies: 1 } } }),
      card("Dina Reg", { rp: true, area: "rp", m: { 11: { participated: true, hours: 55, studies: 3 } } }),
    ];
    const r = A.monthlyTotals(cards, { from: "2026-08", to: "2026-08" }).rows["2026-08"]!;
    expect(r["pubStudies"]).toBe(2);
    expect(r["pubIrregular"]).toBe(1);
    expect([r["auxReported"], r["auxHours"], r["auxStudies"]]).toEqual([1, 30, 1]);
    expect([r["rpReported"], r["rpHours"], r["rpStudies"]]).toEqual([1, 55, 3]);
    expect(r["studies"]).toBe(6);
  });
  it("pioneiro do ano todo: atraso = feitas − 50 × meses", () => {
    const m: Record<number, Partial<Month>> = {};
    for (let i = 0; i < 4; i++) m[i] = { participated: true, hours: 40 }; // set–dez: 160 h
    const r = A.pioneerYear([card("Ana Reg", { rp: true, area: "rp", m })], 2026).list[0]!;
    expect(r.goalNow).toBe(200);
    expect(r.diff).toBe(-40);
    expect(r.goalYear).toBe(600);
    expect(r.need).toBe(55); // (600-160)/8
  });
  it("pioneiro que começou em janeiro: meta do ano 400 h", () => {
    const m: Record<number, Partial<Month>> = { 0: { participated: true }, 4: { participated: true, hours: 52 }, 5: { participated: true, hours: 50 } };
    const r = A.pioneerYear([card("João Reg", { rp: true, area: "rp", m })], 2026, "2026-02").list[0]!;
    expect(r.goalYear).toBe(400);
    expect(r.goalNow).toBe(100);
    expect(r.diff).toBe(2);
  });
  it("importa TSWin: grupo, P.A. e publicador sem somar horas", () => {
    const xml = `<PUBLIST><Active><Pub><fname>Ana</fname><lname>Lima</lname><gender>Female</gender><bapdate>2020-01-01</bapdate><group>2</group>
      <Jan Year="2026"><Hours>1</Hours><BiSt.>2</BiSt.><Remark/><Pio/></Jan><Feb Year="2026"><Hours>30</Hours><BiSt.>1</BiSt.><Remark/><Pio>Aux</Pio></Feb></Pub></Active></PUBLIST>`;
    const gr = A.fromTswinXml(xml, "a.xml").groups[0]!;
    expect(gr.name).toBe("Grupo 2");
    const ms = gr.cards[0]!.months;
    expect(ms[4]).toMatchObject({ month: "2026-01", participated: true, studies: 2, hours: null });
    expect(ms[5]).toMatchObject({ auxiliary: true, hours: 30 });
  });
  it("importa Circuit Manager: pioneiro regular vai para os pioneiros", () => {
    const d = { publishers: [{ id: 1, firstname: "Rui", lastname: "Sá", status: "Regular Pioneer", sex: "Male", group_id: null }], reports: [{ user: { id: 1 }, year: 2026, month: 3, minutes: 3000, studies: 1, pioneer: "Regular" }], fsGroups: [] };
    const gr = A.fromCircuitJson(d, "h.json").groups[0]!;
    expect(gr.rp).toBe(true);
    expect(gr.cards[0]!.months[6]).toMatchObject({ month: "2026-03", hours: 50, studies: 1 });
  });
});
