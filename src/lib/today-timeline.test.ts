import { describe, it, expect } from "vitest";
import { buildDayTimeline, groupByDate, normalizeTime } from "./today-timeline";

describe("buildDayTimeline", () => {
  const src = [
    { id: "a", kind: "meal" as const, time: "12:30", title: "Almoço", date: "2026-10-21" },
    { id: "b", kind: "field" as const, time: "08:30:00", title: "Campo", date: "2026-10-21" },
    { id: "c", kind: "transport" as const, time: null, title: "Carro", date: "2026-10-21" },
    { id: "d", kind: "meeting" as const, time: "19:30", title: "Reunião", date: "2026-10-22" },
  ];

  it("ordena por horário e mostra só o dia pedido", () => {
    expect(buildDayTimeline(src, "2026-10-21").map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("itens sem horário ficam no fim", () => {
    const r = buildDayTimeline(src, "2026-10-21");
    expect(r[r.length - 1].time).toBeNull();
  });

  it("amanhã traz apenas os eventos de amanhã", () => {
    expect(buildDayTimeline(src, "2026-10-22").map((i) => i.id)).toEqual(["d"]);
  });
});

describe("helpers", () => {
  it("normalizeTime", () => {
    expect(normalizeTime("8:5")).toBe("08:05");
    expect(normalizeTime("25:00")).toBeNull();
    expect(normalizeTime("")).toBeNull();
  });
  it("groupByDate ordena as datas", () => {
    const g = groupByDate([{ d: "2026-10-23" }, { d: "2026-10-21" }, { d: "2026-10-23" }], (x) => x.d);
    expect(g.map((x) => [x.date, x.items.length])).toEqual([["2026-10-21", 1], ["2026-10-23", 2]]);
  });
});
