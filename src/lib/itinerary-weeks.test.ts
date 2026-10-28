import { describe, expect, it } from "vitest";
import { buildCustomNotes, isExpiredFreeWeek, parseCustomType, suggestFreeWeeks, weekEndFor } from "./itinerary-weeks";

describe("itinerary weeks", () => {
  it("free week expires on the first Monday after its end", () => {
    const w = { week_type: "free", start_date: "2026-10-12", end_date: "2026-10-18", notes: null };
    expect(isExpiredFreeWeek(w, new Date("2026-10-18T12:00"))).toBe(false);
    expect(isExpiredFreeWeek(w, new Date("2026-10-19T08:00"))).toBe(true);
  });
  it("pioneer and custom weeks never expire", () => {
    expect(isExpiredFreeWeek({ week_type: "pioneer", start_date: "2026-01-05", end_date: "2026-01-11", notes: null }, new Date("2026-10-01"))).toBe(false);
    expect(isExpiredFreeWeek({ week_type: "free", start_date: "2026-01-05", end_date: "2026-01-11", notes: "[Assembleia]" }, new Date("2026-10-01"))).toBe(false);
  });
  it("suggests only weeks in months that have a visit", () => {
    const visits = [{ start_date: "2026-11-03", end_date: "2026-11-08" }];
    const weeks = [{ week_type: "pioneer", start_date: "2026-11-09", end_date: "2026-11-15", notes: null }];
    const s = suggestFreeWeeks(visits, weeks, new Date("2026-10-28"));
    expect(s.map((x) => x.start)).toEqual(["2026-11-16", "2026-11-23", "2026-11-30"]);
  });
  it("week end snaps to Sunday", () => expect(weekEndFor("2026-10-27")).toBe("2026-11-01"));
  it("custom type round trip", () => expect(parseCustomType(buildCustomNotes("Assembleia", "Sede"))).toEqual({ name: "Assembleia", rest: "Sede" }));
});
