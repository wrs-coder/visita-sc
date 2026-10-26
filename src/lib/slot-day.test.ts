import { describe, it, expect } from "vitest";
import { slotDay, slotDays } from "./slot-day";
describe("slotDay", () => {
  it("pega o dia do slot", () => { expect(slotDay("Ter 09:00")).toBe("Ter"); expect(slotDay("Quarta - 15h")).toBe("Quarta"); });
  it("vazio sem slot", () => { expect(slotDay(null)).toBe(""); });
  it("dias distintos em ordem", () => { expect(slotDays(["Ter 9h", "Qui 10h", "Ter 15h", null])).toEqual(["Ter", "Qui"]); });
});
