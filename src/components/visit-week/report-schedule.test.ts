import { describe, it, expect } from "vitest";
import { formatWeekdayTime } from "./report-schedule";

describe("formatWeekdayTime", () => {
  it("usa a mesma ordem da aba (0 = Segunda)", () => {
    expect(formatWeekdayTime(0, "08:00")).toBe("Segunda-feira · 08:00");
    expect(formatWeekdayTime(4, "19:00:00")).toBe("Sexta-feira · 19:00");
    expect(formatWeekdayTime(5, "10:30")).toBe("Sábado · 10:30");
    expect(formatWeekdayTime(6, null)).toBe("Domingo");
  });
  it("mostra 'A combinar' sem dados", () => {
    expect(formatWeekdayTime(null, null)).toBe("A combinar");
  });
});
