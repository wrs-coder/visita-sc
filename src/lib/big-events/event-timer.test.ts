import { describe, expect, it } from "vitest";
import { emptyTimer, tapPart, togglePause, summarize, resetPart, setPartMinutes, toneFor, programLabel, type TimerPart } from "./event-timer";

const P = (id: string, o: number, dur: number | null, extra: Partial<TimerPart> = {}): TimerPart => ({
  id, sort_order: o, theme: id, part_time: null, duration_min: dur, outline_number: null, part_type_id: null,
  part_type_label: "Discurso", assigned_to: "speaker", speaker_name: `Ancião ${id}`, ...extra,
});
const M = 60_000;

describe("controle de tempo do evento", () => {
  it("tocar em outra parte encerra a atual e grava o tempo real", () => {
    let s = tapPart(emptyTimer(), "a", 0);
    s = tapPart(s, "b", 16 * M);
    const sum = summarize([P("a", 1, 15), P("b", 2, 10)], s, 16 * M);
    expect(sum.parts.a.diff).toBe(1 * M);
    expect(sum.programDiff).toBe(1 * M);
    expect(s.active).toBe("b");
  });
  it("pode tocar fora de ordem", () => {
    let s = tapPart(emptyTimer(), "b", 0);
    s = tapPart(s, "a", 8 * M);
    s = tapPart(s, "a", 20 * M);
    const sum = summarize([P("a", 1, 15), P("b", 2, 10)], s, 20 * M);
    expect(sum.parts.b.diff).toBe(-2 * M);
    expect(sum.parts.a.diff).toBe(-3 * M);
    expect(sum.programDiff).toBe(-5 * M);
  });
  it("parte em andamento só conta quando estoura", () => {
    const s = tapPart(emptyTimer(), "a", 0);
    expect(summarize([P("a", 1, 10)], s, 5 * M).programDiff).toBe(0);
    expect(summarize([P("a", 1, 10)], s, 12 * M).programDiff).toBe(2 * M);
  });
  it("pausa não conta tempo", () => {
    let s = tapPart(emptyTimer(), "a", 0);
    s = togglePause(s, 5 * M);
    s = togglePause(s, 9 * M);
    s = tapPart(s, "a", 15 * M);
    expect(summarize([P("a", 1, 10)], s, 15 * M).parts.a.actual).toBe(11 * M);
  });
  it("Oração e Presidente não mudam o programa", () => {
    let s = tapPart(emptyTimer(), "o", 0);
    s = tapPart(s, "o", 5 * M);
    expect(summarize([P("o", 1, 2, { part_type_label: "Oração" })], s, 5 * M).programDiff).toBe(0);
  });
  it("série: desvios dos discursos somam no título e entram uma vez no programa", () => {
    const parts = [P("h", 1, 45, { part_type_id: "SeriesHead" }), P("x", 2, 15, { part_type_id: "SeriesItem" }), P("y", 3, 15, { part_type_id: "SeriesItem" }), P("z", 4, 15, { part_type_id: "SeriesItem" })];
    let s = tapPart(emptyTimer(), "x", 0);
    s = tapPart(s, "y", 17 * M); // +2
    let sum = summarize(parts, s, 17 * M);
    expect(sum.parts.h.diff).toBe(2 * M);
    expect(sum.programDiff).toBe(2 * M);
    s = tapPart(s, "z", 31 * M); // y −1
    s = tapPart(s, "z", 47 * M); // z +1 → total 47 vs 45
    sum = summarize(parts, s, 47 * M);
    expect(sum.parts.h.diff).toBe(2 * M);
    expect(sum.programDiff).toBe(2 * M);
    expect(sum.bySpeaker.find((b) => b.name === "Ancião x")?.diff).toBe(2 * M);
  });
  it("relatório por ancião soma todas as partes dele", () => {
    let s = tapPart(emptyTimer(), "a", 0);
    s = tapPart(s, "b", 12 * M);
    s = tapPart(s, "b", 20 * M);
    const sum = summarize([P("a", 1, 10, { speaker_name: "João" }), P("b", 2, 10, { speaker_name: "João" })], s, 20 * M);
    expect(sum.bySpeaker).toEqual([{ name: "João", diff: 0, parts: 2 }]);
  });
  it("refazer e corrigir", () => {
    let s = tapPart(emptyTimer(), "a", 0);
    s = tapPart(s, "a", 20 * M);
    s = setPartMinutes(s, "a", 9);
    expect(summarize([P("a", 1, 10)], s, 0).parts.a.diff).toBe(-1 * M);
    s = resetPart(s, "a", 0);
    expect(summarize([P("a", 1, 10)], s, 0).programDiff).toBe(0);
  });
  it("cores e rótulo", () => {
    expect(toneFor(10 * M, 5 * M)).toBe("ok");
    expect(toneFor(10 * M, 9.5 * M)).toBe("warn");
    expect(toneFor(10 * M, 11 * M)).toBe("over");
    expect(programLabel(3 * M)).toBe("Programa +3 min atrasado");
    expect(programLabel(-2 * M)).toBe("Programa 2 min adiantado");
  });
});
