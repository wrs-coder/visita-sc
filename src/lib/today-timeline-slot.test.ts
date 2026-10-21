import { describe, it, expect } from "vitest";
import { resolveWeekdaySlot } from "./today-timeline";

// 2026-10-20 é terça-feira.
const days = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];

describe("resolveWeekdaySlot", () => {
  it("terça (1) às 19:30 cai em 2026-10-20", () => {
    expect(resolveWeekdaySlot(1, "19:30:00", days)).toEqual({ date: "2026-10-20", at: "2026-10-20T19:30:00" });
  });
  it("domingo (6) cai em 2026-10-25", () => {
    expect(resolveWeekdaySlot(6, "9:00", days)?.date).toBe("2026-10-25");
  });
  it("sem dia definido não gera reunião", () => {
    expect(resolveWeekdaySlot(null, "19:30", days)).toBeNull();
  });
  it("segunda fora dos dias da visita não gera reunião", () => {
    expect(resolveWeekdaySlot(0, "19:30", days)).toBeNull();
  });
});
