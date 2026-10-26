import { describe, it, expect } from "vitest";
import { pickInitialVisitDay } from "./visit-day-pills";

const keys = ["2026-10-13", "2026-10-14", "2026-10-15"];
describe("dia inicial das pílulas da visita", () => {
  it("abre no dia de hoje durante a visita", () => {
    expect(pickInitialVisitDay(keys, "2026-10-14")).toBe("2026-10-14");
  });
  it("fora da visita abre no 1º dia", () => {
    expect(pickInitialVisitDay(keys, "2026-11-01")).toBe("2026-10-13");
  });
});
