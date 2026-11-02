import { beforeEach, describe, expect, it } from "vitest";
import { loadReaderSettings, saveReaderSettings, sanitizeReaderSettings } from "./bible-reader-settings";
import { loadSettings } from "./bible-view-settings";
import { weekdayBookDays, emptyWeekday } from "./bible-tracks";

describe("bible reader settings", () => {
  beforeEach(() => localStorage.clear());
  it("defaults and clamps", () => {
    expect(loadReaderSettings()).toMatchObject({ textScale: 1, bg: "white", font: "system", brightness: null });
    expect(sanitizeReaderSettings({ textScale: 9, lineHeight: 0, bg: "pink", brightness: 0 })).toMatchObject({ textScale: 2, lineHeight: 1.4, bg: "white", brightness: 0.1 });
  });
  it("does not touch the verse popover settings", () => {
    saveReaderSettings({ textScale: 1.6, bg: "sepia" });
    expect(loadSettings().textScale).toBe(1);
    expect(loadReaderSettings()).toMatchObject({ textScale: 1.6, bg: "sepia" });
  });
});

describe("weekdayBookDays", () => {
  it("lists every day a book is planned, Monday first", () => {
    const p = emptyWeekday();
    p.days[0] = ["B40"]; p.days[2] = ["B40", "B19"]; p.days[1] = ["B1"];
    const m = weekdayBookDays(p);
    expect(m.get("B40")).toEqual([2, 0]);
    expect(m.get("B1")).toEqual([1]);
    expect(m.has("B2")).toBe(false);
  });
});
