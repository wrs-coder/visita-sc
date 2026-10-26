import { describe, expect, it } from "vitest";
import { buildMonthGrid } from "./month-grid";

const nov = new Date(2026, 10, 1);

describe("buildMonthGrid", () => {
  it("começa na segunda-feira e fecha semanas de 7 dias", () => {
    const g = buildMonthGrid(nov, [], []);
    expect(g[0][0].key).toBe("2026-10-26");
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[0][0].inMonth).toBe(false);
  });
  it("conta os eventos de cada dia", () => {
    const g = buildMonthGrid(nov, [{ event_date: "2026-11-05" }, { event_date: "2026-11-05" }], []);
    const cell = g.flat().find((c) => c.key === "2026-11-05");
    expect(cell?.eventCount).toBe(2);
  });
  it("a visita aparece em todos os dias entre início e fim", () => {
    const g = buildMonthGrid(nov, [], [{ id: "v1", start_date: "2026-11-03", end_date: "2026-11-08" }]);
    const marked = g.flat().filter((c) => c.visitIds.includes("v1")).map((c) => c.key);
    expect(marked).toEqual(["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
  });
});
