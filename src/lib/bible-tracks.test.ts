import { describe, it, expect } from "vitest";
import { commentList, meetingWeekKeys, mondayOf, weekdayAdvance, weekdayCurrent, emptyWeekday } from "./bible-tracks";
import { sanitizeWs } from "./guest-workspace-store";

describe("bible tracks", () => {
  it("meeting week advances perWeek chapters every Monday", () => {
    const mw = { anchorMonday: "2026-10-26", startKey: "B23:58", perWeek: 2 };
    expect(meetingWeekKeys(mw, new Date(2026, 9, 28))).toEqual(["B23:58", "B23:59"]);
    expect(meetingWeekKeys(mw, new Date(2026, 10, 2))).toEqual(["B23:60", "B23:61"]);
    expect(mondayOf(new Date(2026, 10, 1))).toBe("2026-10-26");
  });
  it("weekday reading resumes and wraps to the first book", () => {
    const p = { ...emptyWeekday(), enabled: true, days: emptyWeekday().days.map((d, i) => (i === 3 ? ["B57"] : d)) };
    expect(weekdayCurrent(p, 3)).toBe("B57:1");
    expect(weekdayCurrent(weekdayAdvance(p, 3, "B57:1"), 3)).toBe("B57:1"); // Filemom tem 1 capítulo
    expect(weekdayCurrent(p, 2)).toBeNull();
  });
  it("Para comentar lists this week's meeting highlights and starred ones", () => {
    const list = commentList([
      { id: "a", ref: "", bookId: null, text: "", date: "2026-10-27T10:00:00Z", track: "meeting" },
      { id: "b", ref: "", bookId: null, text: "", date: "2026-10-10T10:00:00Z", track: "meeting" },
      { id: "c", ref: "", bookId: null, text: "", date: "2026-10-10T10:00:00Z", star: true },
      { id: "d", ref: "", bookId: null, text: "", date: "2026-10-28T10:00:00Z" },
    ], new Date(2026, 9, 29));
    expect(list.map((h) => h.id).sort()).toEqual(["a", "c"]);
  });
  it("old data stays personal; new readings survive sanitize", () => {
    const d = sanitizeWs({ reading: { plan: "canon", done: ["B01:1"] }, highlights: [{ id: "x", ref: "Gên 1:1", text: "t" }],
      readings: { family: { plan: "canon", done: ["B40:5"] } } });
    expect(d.reading.done).toEqual(["B01:1"]);
    expect(d.highlights[0].track).toBeUndefined();
    expect(d.readings?.family?.done).toEqual(["B40:5"]);
  });
});
