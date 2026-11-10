import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { applyProgramRules, typeForTheme } from "./program-rules";
import { parseRtfProgram } from "./rtf-program-import";
import { recomputeTimes } from "./invite";

const RTF = String.raw`{\rtf1\ansi\pard Programa\par X\par Manh\u227?\par 9:40 M\u250?sica\par 9:50 C\u226?ntico 7 e ora\u231?\u227?o\par 10:00 Por que confiar em Jeov\u225?\par 10:15 S\u233?rie de discursos: Imite aqueles que confiaram!\par \u8226? Baraque\par \u8226? A mulher sunamita\par 11:00 C\u226?ntico 45 e an\u250?ncios\par 11:10 Discurso do Batismo\par Tarde\par 1:20 V\u237?deo musical\par 1:30 C\u226?ntico e ora\u231?\u227?o\par 1:40 Resumo de A Sentinela\par 2:10 Experi\u234?ncias\par}`;
const parts = () => applyProgramRules(parseRtfProgram(RTF).parts, { renumber: true });

describe("regras da importação do programa", () => {
  it("numera só as partes de esboço, em ordem, inclusive cada • da série", () => {
    const p = parts();
    expect(p.filter((x) => x.outline_number).map((x) => [x.outline_number, x.theme])).toEqual([
      ["1", "Por que confiar em Jeová"],
      ["2", "Imite aqueles que confiaram! — Baraque"],
      ["3", "Imite aqueles que confiaram! — A mulher sunamita"],
      ["4", "Discurso do Batismo"],
      ["5", "Resumo de A Sentinela"],
      ["6", "Experiências"],
    ]);
  });
  it("marca o tipo automaticamente", () => {
    expect(typeForTheme("Discurso do Batismo", false)).toBe("Discurso Batismo");
    expect(typeForTheme("Discurso Público: x", false)).toBe("Discurso Público");
    expect(typeForTheme("Resumo de A Sentinela", false)).toBe("A Sentinela");
    expect(typeForTheme("Experiências", false)).toBe("Entrevistas");
    expect(typeForTheme("Baraque", true)).toBe("Simpósio");
    expect(typeForTheme("Por que confiar", false)).toBe("Discurso");
  });
  it("cria a Oração no mesmo horário do cântico, sem tempo e sem número", () => {
    const p = parts();
    const pr = p.filter((x) => x.part_type_label === "Oração");
    expect(pr.map((x) => x.part_time)).toEqual(["09:50", "13:30"]);
    expect(pr.every((x) => x.duration_min == null && x.outline_number == null)).toBe(true);
  });
  it("cria o Presidente 40 minutos antes da Música e do Vídeo musical", () => {
    const p = parts();
    const ch = p.filter((x) => x.part_type_label === "Presidência do programa");
    expect(ch.map((x) => x.part_time)).toEqual(["09:00", "12:40"]);
    expect(ch.every((x) => x.duration_min == null && x.outline_number == null)).toBe(true);
    expect(p[1].theme).toBe("Música");
  });
  it("Oração e Presidente não empurram os horários seguintes", () => {
    const list = [
      { id: "a", sort_order: 0, part_time: "09:00", duration_min: null, time_mode: "manual", part_type_label: "Presidência do programa" },
      { id: "b", sort_order: 1, part_time: "09:40", duration_min: 10, time_mode: "manual", part_type_label: null },
      { id: "c", sort_order: 2, part_time: null, duration_min: 10, time_mode: "auto", part_type_label: null },
      { id: "d", sort_order: 3, part_time: "09:50", duration_min: null, time_mode: "manual", part_type_label: "Oração" },
      { id: "e", sort_order: 4, part_time: null, duration_min: 15, time_mode: "auto", part_type_label: null },
    ];
    expect(recomputeTimes("09:00", list).map((x) => x.part_time)).toEqual(["09:00", "09:40", "09:50", "09:50", "10:00"]);
  });
  it("respeita números que o arquivo já trouxe", () => {
    const p = applyProgramRules([{ part_time: "10:00", duration_min: 10, theme: "Tema", outline_number: "7", instructions: null, part_type_id: null, part_type_label: null, symposium: false, talk_includes: [], assigned_to: "speaker" }]);
    expect(p[0].outline_number).toBe("7");
    expect(p[0].part_type_label).toBe("Discurso");
  });
});

describe("programa real do jw.org (Assembleia de Circuito 2026-2027)", () => {
  const text = readFileSync(new URL("./sample-program.rtf", import.meta.url), "latin1");
  const p = applyProgramRules(parseRtfProgram(text).parts, { renumber: true });
  it("título da série conta no programa com o tempo total; discursos sem tempo", () => {
    const heads = p.filter((x) => x.theme.startsWith("Série de discursos"));
    expect(heads.map((x) => [x.part_time, x.duration_min, x.outline_number])).toEqual([["10:15", 50, null], ["14:45", 45, null]]);
    const items = p.filter((x) => x.part_type_id === "SeriesItem");
    expect(items).toHaveLength(6);
    expect(items.every((x) => x.duration_min == null && x.assigned_to === "speaker")).toBe(true);
    expect(items.map((x) => x.outline_number)).toEqual(["2", "3", "4", "9", "10", "11"]);
  });
  it("toda parte sai com o modo de horário preenchido (o lote não pode ter campo vazio)", () => {
    expect(p.every((x) => x.time_mode === "auto" || x.time_mode === "manual")).toBe(true);
  });
  it("discursos da série não deslocam o horário do programa", () => {
    const rows = p.map((x, i) => ({ ...x, id: String(i), sort_order: i }));
    const t = recomputeTimes("09:00", rows);
    const after = rows.findIndex((x) => x.theme.startsWith("Cântico 57"));
    expect(t[after].part_time).toBe("11:05");
  });
});
