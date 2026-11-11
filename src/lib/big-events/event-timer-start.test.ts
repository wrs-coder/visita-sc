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
  it("antes de começar, fora do dia do evento, não mostra atraso", () => {
    expect(startDelayMin(600, "2026-11-12", null, new Date(2026, 10, 11, 23, 0).getTime())).toBeNull();
  });
});

import { clockProgramDiff as _cpd, startDelayMin as _sdm, programLabel as _pl, emptyTimer as _et, tapPart as _tp, type TimerPart as _TP } from "./event-timer";
import { partExtrasLabel as _pel } from "./invite";
describe("relógio real do programa", () => {
  const part: _TP = { id: "a", sort_order: 1, theme: "Discurso", part_time: "10:00", duration_min: 16, outline_number: "3", part_type_id: null, part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "João" };
  const at = (h: number, m: number) => new Date(2026, 10, 11, h, m).getTime();
  it("sino compara pela hora do celular mesmo fora do dia do evento", () => {
    expect(_sdm(600, "2026-12-05", at(2, 23), at(2, 24))).toBe(-457);
  });
  it("discurso das 10:00 iniciado 02:23 → programa 7h37 adiantado", () => {
    let s = _tp(_et(), "a", at(2, 23));
    s = _tp(s, "a", at(2, 39)); // encerra com 16 min
    expect(Math.round(_cpd([part], s, at(2, 40))! / 60_000)).toBe(-457);
    expect(_pl(-457 * 60_000)).toBe("Programa 7h37 adiantado");
  });
  it("parte rodando e estourando atrasa ao vivo", () => {
    const s = _tp(_et(), "a", at(10, 0));
    expect(Math.round(_cpd([part], s, at(10, 20))! / 60_000)).toBe(4);
  });
  it("Presidência e Oração não levam participações", () => {
    expect(_pel({ talk_includes: ["__x:video"], part_type_label: "Oração" })).toBeNull();
  });
});
