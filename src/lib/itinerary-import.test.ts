import { describe, expect, it } from "vitest";
import { classifySummary, findConflict, matchCongregation, parseCsv, parseDateRange, parseIcs } from "./itinerary-import";

const ICS = [
  "BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261027", "DTEND;VALUE=DATE:20261102",
  "SUMMARY:(Visita à Congregação) - Cidade do Sequele 09 - Sequele,, I.B ", "  (20398)", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261110", "DTEND;VALUE=DATE:20261116", "SUMMARY:Serviço de Circuito:   Semana de Pioneiro", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270206", "DTEND;VALUE=DATE:20270207", "SUMMARY:Serviço de Circuito:   Assembleia de Circuito CA-BR (Parte(s): 1)", "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("importação do itinerário", () => {
  it("ics: fim exclusivo de dia inteiro vira domingo", () => {
    const r = parseIcs(ICS);
    expect(r[0]).toMatchObject({ kind: "visit", label: "Cidade do Sequele 09", start: "2026-10-27", end: "2026-11-01" });
  });
  it("semana de pioneiro vai para semanas sem visita", () => {
    expect(parseIcs(ICS)[1]).toMatchObject({ kind: "pioneer", start: "2026-11-10", end: "2026-11-15" });
  });
  it("outros eventos viram semana livre com o nome do evento", () => {
    expect(parseIcs(ICS)[2]).toMatchObject({ kind: "free", label: "Assembleia de Circuito CA-BR", end: "2027-02-06" });
    expect(classifySummary("Serviço de Circuito: Escola do Ministério do Reino")).toMatchObject({ kind: "free", label: "Escola do Ministério do Reino" });
  });
  it("treinamento SCS é reconhecido", () => {
    expect(classifySummary("(Visita à Congregação - Treinando SCS) - Mayé-Mayé 01 - Sequele").training).toBe(true);
  });
  it("datas por extenso e numéricas", () => {
    expect(parseDateRange("13 a 18 de outubro de 2026")).toEqual({ start: "2026-10-13", end: "2026-10-18" });
    expect(parseDateRange("27 de outubro a 01 de novembro de 2026")).toEqual({ start: "2026-10-27", end: "2026-11-01" });
    expect(parseDateRange("29/12/2026 a 03/01/2027")).toEqual({ start: "2026-12-29", end: "2027-01-03" });
  });
  it("csv com ; classifica por Tipo", () => {
    const r = parseCsv("Data Completa;Tipo;Congregação;Esquema\r\n13 a 18 de outubro de 2026;Semana de Pioneiro;;\r\n20 a 25 de outubro de 2026;Visita Regular;Cabiri;\r\n02 a 07 de fevereiro de 2027;Assembleia com Rep. Betel;;\r\n");
    expect(r.map((x) => x.kind)).toEqual(["pioneer", "visit", "free"]);
    expect(r[2].label).toBe("Assembleia com Rep. Betel");
  });
  it("nomes: zero à esquerda casa forte; número diferente não sugere", () => {
    const congs = [{ id: "1", name: "Mayé-Mayé 01" }, { id: "3", name: "Cidade do Sequele 09" }];
    expect(matchCongregation("Mayé-Mayé 1", congs)).toEqual({ id: "1", score: 100 });
    expect(matchCongregation("Cidade do Sequele 10", congs).id).toBeNull();
  });
  it("conflito: mesma congregação e datas já existe", () => {
    const c = findConflict({ kind: "visit", start: "2026-10-27", end: "2026-11-01", congregationId: "3" },
      [{ start_date: "2026-10-27", end_date: "2026-11-01", congregation_id: "3" }], [], () => "X");
    expect(c?.exists).toBe(true);
  });
});
