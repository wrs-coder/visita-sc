import { describe, expect, it } from "vitest";
import { displayClock, emptyTimer, plannedStarts, resetPart, startDelayMin, tapPart, type TimerPart } from "./event-timer";
import { SERIES_HEAD, SERIES_ITEM } from "./program-rules";

const P = (id: string, o: number, time: string | null, dur: number | null, type: string | null = null): TimerPart => ({
  id, sort_order: o, theme: id, part_time: time, duration_min: dur, outline_number: null, part_type_id: type,
  part_type_label: "Discurso", assigned_to: "speaker", speaker_name: null,
});
const M = 60_000;
const at = (h: number, m: number) => new Date(2026, 10, 11, h, m).getTime();

describe("início previsto × real e modos", () => {
  it("temporizador conta para baixo e cronômetro para cima", () => {
    expect(displayClock("down", 16 * M, 2 * M)).toBe("14:00");
    expect(displayClock("down", 16 * M, 17 * M)).toBe("-1:00");
    expect(displayClock("up", 16 * M, 17 * M)).toBe("17:00");
  });
  it("começou 5 min depois do horário do programa = +5", () => {
    expect(startDelayMin(10 * 60, "2026-11-11", at(10, 5), at(10, 30))).toBe(5);
    expect(startDelayMin(10 * 60, "2026-11-11", at(9, 58), at(10, 30))).toBe(-2);
  });
  it("não iniciada: atraso só depois da hora prevista e no dia do evento", () => {
    expect(startDelayMin(10 * 60, "2026-11-11", null, at(9, 50))).toBeNull();
    expect(startDelayMin(10 * 60, "2026-11-11", null, at(10, 4))).toBe(4);
    expect(startDelayMin(10 * 60, "2026-11-12", null, at(10, 4))).toBeNull();
  });
  it("os • da série seguem o horário do título somando os tempos", () => {
    const st = plannedStarts([P("h", 1, "10:15", 47, SERIES_HEAD), P("a", 2, null, 16, SERIES_ITEM), P("b", 3, null, 15, SERIES_ITEM)]);
    expect(st).toEqual({ h: 615, a: 615, b: 631 });
  });
  it("guarda o primeiro início e refazer apaga", () => {
    let s = tapPart(emptyTimer(), "a", 100);
    s = tapPart(s, "b", 200);
    s = tapPart(s, "a", 300);
    expect(s.firstStart).toEqual({ a: 100, b: 200 });
    expect(resetPart(s, "b", 400).firstStart).toEqual({ a: 100 });
  });
});
describe("dia do evento", () => {
  it("parte iniciada em outro dia (teste) não mostra atraso", () => {
    expect(startDelayMin(600, "2026-11-12", new Date(2026, 10, 11, 23, 0).getTime(), 0)).toBeNull();
  });
});
