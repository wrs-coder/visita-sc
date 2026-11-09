import { describe, expect, it } from "vitest";
import { overdueDays } from "./reading-day-log";
import type { WeekdayPlan } from "./bible-tracks";

// Leitura programada de segunda a sexta (1..5).
const plan: WeekdayPlan = {
  enabled: true,
  days: [[], ["B01"], ["B01"], ["B01"], ["B01"], ["B01"], []],
  pos: Array(7).fill(null),
};
const wed = new Date(2026, 10, 11); // quarta-feira, 11/11/2026

describe("leitura atrasada", () => {
  it("leu ontem: sem atraso", () => { expect(overdueDays(plan, "2026-11-10", wed)).toBe(0); });
  it("última leitura na sexta: atrasada 2 dias (segunda e terça; fim de semana não conta)", () => {
    expect(overdueDays(plan, "2026-11-06", wed)).toBe(2);
  });
  it("leu hoje: sem atraso", () => { expect(overdueDays(plan, "2026-11-11", wed)).toBe(0); });
  it("meta Dias desligada ou sem registro: sem atraso", () => {
    expect(overdueDays({ ...plan, enabled: false }, "2026-11-01", wed)).toBe(0);
    expect(overdueDays(plan, null, wed)).toBe(0);
  });
});
