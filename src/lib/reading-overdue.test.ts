import { describe, expect, it } from "vitest";
import { creditDayFor, creditLog, lateWeekdays, overdueDays, weekdayPending, type WeekdayLog } from "./reading-day-log";
import type { WeekdayPlan } from "./bible-tracks";

// Leitura programada de segunda a sexta (1..5).
const plan: WeekdayPlan = {
  enabled: true,
  days: [[], ["B01"], ["B01"], ["B01"], ["B01"], ["B01"], []],
  pos: Array(7).fill(null),
};
const wed = new Date(2026, 10, 11); // quarta-feira, 11/11/2026

describe("leitura atrasada (registro geral de aparelhos antigos)", () => {
  it("leu ontem: sem atraso", () => { expect(overdueDays(plan, "2026-11-10", wed)).toBe(0); });
  it("última leitura na sexta: atrasada 2 dias (segunda e terça; fim de semana não conta)", () => {
    expect(overdueDays(plan, "2026-11-06", wed)).toBe(2);
  });
  it("leu hoje: sem atraso", () => { expect(overdueDays(plan, "2026-11-11", wed)).toBe(0); });
  it("meta Dias desligada ou sem registro: sem atraso", () => {
    expect(overdueDays({ ...plan, enabled: false }, "2026-11-01", wed)).toBe(0);
    expect(overdueDays(plan, null, wed)).toBe(0);
  });
  it("sem registro no aparelho: plano novo não acusa atraso; plano começado e não concluído acusa", () => {
    expect(overdueDays(plan, null, wed, new Set())).toBe(0);
    expect(overdueDays(plan, null, wed, new Set(["B01:1"]))).toBe(5);
    const all = new Set(Array.from({ length: 50 }, (_, i) => `B01:${i + 1}`));
    expect(overdueDays(plan, null, wed, all)).toBe(0);
  });
});

// Regra do Wanderson: atraso individual por dia da semana, cada dia no seu ciclo de 7 dias.
const sunday: WeekdayPlan = { enabled: true, days: [["B02"], [], [], [], [], [], []], pos: Array(7).fill(null) };
const sunWed: WeekdayPlan = { enabled: true, days: [["B02"], [], [], ["B03"], [], [], []], pos: Array(7).fill(null) };
const log = (entries: Record<number, string>): WeekdayLog => Array.from({ length: 7 }, (_, i) => entries[i] ?? null);
const day = (d: number) => new Date(2026, 10, d); // novembro/2026; dia 8 = domingo

describe("atraso por dia da semana", () => {
  it("leu domingo 08: em dia de segunda até o domingo seguinte (15)", () => {
    const l = log({ 0: "2026-11-08" });
    for (const d of [9, 11, 14, 15]) expect(overdueDays(sunday, "2026-11-08", day(d), new Set(), l)).toBe(0);
  });
  it("domingo 15 passou sem leitura: segunda 16 aparece atrasado", () => {
    expect(lateWeekdays(sunday, "2026-11-08", day(16), new Set(), log({ 0: "2026-11-08" }))).toEqual([0]);
  });
  it("leitura de um dia não tira nem cria atraso de outro dia", () => {
    // Domingo lido, quarta (04) não lida: na quinta 12 só a quarta está atrasada.
    const l = log({ 0: "2026-11-08", 3: "2026-11-04" });
    expect(lateWeekdays(sunWed, "2026-11-08", day(12), new Set(), l)).toEqual([3]);
  });
  it("ler o domingo atrasado durante a semana tira o atraso até o próximo domingo passar", () => {
    const l = creditLog(log({ 0: "2026-11-01" }), 0, day(10)); // terça 10 lê o domingo 08
    expect(l[0]).toBe("2026-11-08");
    expect(overdueDays(sunday, null, day(10), new Set(), l)).toBe(0);
    expect(overdueDays(sunday, null, day(16), new Set(), l)).toBe(1);
  });
  it("ler o domingo adiantado no sábado vale para o domingo seguinte", () => {
    const l = creditLog(log({ 0: "2026-11-08" }), 0, day(14));
    expect(l[0]).toBe("2026-11-15");
    expect(overdueDays(sunday, null, day(16), new Set(), l)).toBe(0);
  });
  it("leitura de hoje pendente só até marcar a leitura do dia", () => {
    expect(weekdayPending(sunday, new Set(), null, day(15), log({ 0: "2026-11-08" }))).toBe(true);
    expect(weekdayPending(sunday, new Set(), null, day(15), log({ 0: "2026-11-15" }))).toBe(false);
  });
  it("capítulo marcado fora do cartão de dias vai para o dia do livro", () => {
    expect(creditDayFor(sunWed, "B03:2", day(10))).toBe(3);
    expect(creditDayFor(sunWed, "B02:2", day(15))).toBe(0);
    expect(creditDayFor(sunWed, "B05:1", day(15))).toBeNull();
  });
});
