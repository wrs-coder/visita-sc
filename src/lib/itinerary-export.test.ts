import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { offWeekTitle, weekLanes, isScsVisit, buildExportRows, monthPages, periodRange, itineraryListHtml, itineraryXlsx } from "./itinerary-export";
const congs = [{ id: "c1", name: "Cabiri (18911)" }, { id: "c2", name: "Vila Nova" }];
const visits = [
  { start_date: "2026-11-24", end_date: "2026-11-29", title: "Visita", congregation_id: "c2" },
  { start_date: "2026-11-03", end_date: "2026-11-08", title: "Visita", congregation_id: "c1" },
];
const weeks = [{ start_date: "2026-11-17", end_date: "2026-11-23", week_type: "free" as const, notes: null }];
describe("exportar itinerário", () => {
  it("segue a ordem exata, incluindo semanas sem visita", () => {
    const r = buildExportRows(visits, congs, weeks, { range: null, includeOff: true });
    expect(r.map((x) => x.title)).toEqual(["Cabiri (18911)", "Semana livre", "Vila Nova"]);
  });
  it("pode excluir semanas sem visita", () => {
    expect(buildExportRows(visits, congs, weeks, { range: null, includeOff: false })).toHaveLength(2);
  });
  it("1º semestre = set a fev do ano seguinte; 2º = mar a ago", () => {
    expect(periodRange("sem1", new Date(2026, 10, 3))).toEqual({ from: "2026-09-01", to: "2027-02-28" });
    expect(periodRange("sem1", new Date(2027, 0, 10))).toEqual({ from: "2026-09-01", to: "2027-02-28" });
    expect(periodRange("sem2", new Date(2026, 10, 3))).toEqual({ from: "2027-03-01", to: "2027-08-31" });
    expect(periodRange("sem1", new Date(2027, 8, 1))).toEqual({ from: "2027-09-01", to: "2028-02-29" });
  });
  it("personalizado usa as datas e recusa período invertido", () => {
    expect(periodRange("custom", new Date(), { from: "2026-10-01", to: "2026-12-31" })).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(periodRange("custom", new Date(), { from: "2026-12-31", to: "2026-10-01" })).toBeNull();
  });
  it("calendário de 6 meses cabe em 1 folha", () => {
    const rows = [{ start: "2026-11-03", end: "2026-11-08", kind: "visit" as const, title: "a", detail: "" }, { start: "2027-04-20", end: "2027-04-26", kind: "visit" as const, title: "b", detail: "" }];
    const pages = monthPages(rows);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(6);
  });
  it("ano de serviço vai de setembro a agosto", () => {
    expect(periodRange("serviceYear", new Date(2026, 10, 3))).toEqual({ from: "2026-09-01", to: "2027-08-31" });
  });
  it("não inclui código de acesso", () => {
    const r = buildExportRows(visits, [{ id: "c1", name: "Cabiri", invite_code: "48213" } as never], [], { range: null, includeOff: true });
    expect(itineraryListHtml(r, { generatedAt: new Date() })).not.toContain("48213");
  });
  it("xlsx tem cabeçalho + uma linha por semana", async () => {
    const r = buildExportRows(visits, congs, weeks, { range: null, includeOff: true });
    const z = await JSZip.loadAsync(await (await itineraryXlsx(r)).arrayBuffer());
    const xml = await z.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(xml.match(/<row /g)).toHaveLength(4);
  });
  it("semana de pioneiro mostra as observações", () => {
    expect(offWeekTitle({ week_type: "pioneer", notes: "Assembleia\noutra linha" })).toBe("Semana de pioneiro - Assembleia");
    expect(offWeekTitle({ week_type: "pioneer", notes: null })).toBe("Semana de pioneiro");
    expect(offWeekTitle({ week_type: "free", notes: "[Férias] Viagem" })).toBe("Férias - Viagem");
  });
  it("mesma semana com visita e duas semanas sem visita gera 3 faixas, visita primeiro", () => {
    const rows = [
      { start: "2027-02-16", end: "2027-02-17", kind: "off", title: "EMR-SC", detail: "" },
      { start: "2027-02-15", end: "2027-02-21", kind: "off", title: "Semana de pioneiro - Assembleia", detail: "" },
      { start: "2027-02-16", end: "2027-02-21", kind: "visit", title: "Cabiri", detail: "Visita" },
    ] as const;
    const days = ["2027-02-15", "2027-02-16", "2027-02-17", "2027-02-18", "2027-02-19", "2027-02-20", "2027-02-21"];
    const l = weekLanes([...rows], days);
    expect(l).toHaveLength(3);
    expect(l[0].kind).toBe("visit");
  });
  it("Visita SCS ganha a marca SCS ao lado da congregação", () => {
    const r = buildExportRows([{ start_date: "2027-03-01", end_date: "2027-03-07", title: "Visita SCS", congregation_id: "c1" }], [{ id: "c1", name: "Cabiri" }], [], { range: null, includeOff: false });
    expect(r[0].title).toBe("Cabiri · SCS");
    const n = buildExportRows([{ start_date: "2027-03-01", end_date: "2027-03-07", title: "Visita + Treinamento SCS", congregation_id: "c1" }], [{ id: "c1", name: "Cabiri" }], [], { range: null, includeOff: false });
    expect(n[0].title).toBe("Cabiri");
  });
});
