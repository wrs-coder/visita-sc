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

import { formatAnchorWeekdayTime } from "./report-schedule";
describe("formatAnchorWeekdayTime", () => {
  it("lê dia e horário da data âncora", () => {
    expect(formatAnchorWeekdayTime(new Date("2024-01-09T19:30:00").toISOString())).toBe("Terça-feira · 19:30");
    expect(formatAnchorWeekdayTime(new Date("2024-01-07T09:00:00").toISOString())).toBe("Domingo · 09:00");
    expect(formatAnchorWeekdayTime(null)).toBe("A combinar");
  });
});
