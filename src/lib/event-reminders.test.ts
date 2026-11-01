import { describe, expect, it } from "vitest";
import { inQuiet, planReminders, type ReminderPrefs } from "./event-reminders";
import type { TimelineSource } from "./today-timeline";

const now = new Date(2026, 9, 24, 8, 0);
const item = (p: Partial<TimelineSource>): TimelineSource =>
  ({ id: "x", kind: "meal", date: "2026-10-24", time: "12:30", title: "Almoço", ...p }) as TimelineSource;
const on: ReminderPrefs = { enabled: true, lead: 30, kinds: ["meal", "meeting", "field", "transport", "schedule", "study"] };

describe("planReminders", () => {
  it("subtracts the chosen lead time", () => {
    const [r] = planReminders([item({})], on, "superintendent", now);
    expect(r.at.getHours()).toBe(12);
    expect(r.at.getMinutes()).toBe(0);
  });
  it("supports 1 day before", () => {
    const [r] = planReminders([item({ date: "2026-10-26" })], { ...on, lead: 1440 }, "superintendent", now);
    expect(r.at.getDate()).toBe(25);
  });
  it("skips past events and events without time", () => {
    expect(planReminders([item({ time: "08:10" }), item({ id: "y", time: null })], on, "superintendent", now)).toHaveLength(0);
  });
  it("elders only get meetings and field", () => {
    const list = planReminders([item({}), item({ id: "m", kind: "meeting" })], on, "elder", now);
    expect(list.map((r) => r.kind)).toEqual(["meeting"]);
  });
  it("wife does not get meetings", () => {
    expect(planReminders([item({ kind: "meeting" })], on, "wife", now)).toHaveLength(0);
  });
  it("nothing when disabled", () => {
    expect(planReminders([item({})], { ...on, enabled: false }, "superintendent", now)).toHaveLength(0);
  });
});

describe("planReminders – extra options", () => {
  it("uses the per-type lead when set", () => {
    const [r] = planReminders([item({})], { ...on, leadByKind: { meal: 15 } }, "superintendent", now);
    expect(r.at.getMinutes()).toBe(15);
  });
  it("adds a second reminder", () => {
    const list = planReminders([item({ date: "2026-10-26" })], { ...on, second: 1440 }, "superintendent", now);
    expect(list.map((r) => r.at.getDate())).toEqual([25, 26]);
  });
  it("skips reminders inside quiet hours (across midnight)", () => {
    const quiet = { on: true, from: "22:00", to: "06:00" };
    expect(planReminders([item({ date: "2026-10-25", time: "06:15" })], { ...on, quiet }, "superintendent", now)).toHaveLength(0);
    expect(inQuiet(new Date(2026, 9, 24, 12, 0), quiet)).toBe(false);
  });
  it("creates one daily summary at the chosen time", () => {
    const list = planReminders(
      [item({ date: "2026-10-25" }), item({ id: "m", kind: "meeting", date: "2026-10-25", time: "19:30" })],
      { ...on, digest: { on: true, time: "07:00" } }, "superintendent", now,
    );
    const d = list.filter((r) => r.kind === "digest");
    expect(d).toHaveLength(1);
    expect(d[0].at.getHours()).toBe(7);
    expect(d[0].title).toBe("Hoje: 2 compromissos");
  });
});

import { leadToMinutes, splitLead, planReadingReminders } from "./event-reminders";
describe("lead units and reading reminders", () => {
  it("converts free lead with units", () => {
    expect(leadToMinutes(2, "h")).toBe(120);
    expect(leadToMinutes(3, "d")).toBe(4320);
    expect(leadToMinutes(1, "w")).toBe(10080);
    expect(splitLead(4320)).toEqual({ n: 3, unit: "d" });
    expect(splitLead(45)).toEqual({ n: 45, unit: "min" });
  });
  it("schedules reading at chosen time and skips today when already read", () => {
    const now = new Date(2026, 10, 2, 5, 0); // segunda
    const p = { enabled: false, lead: 30, kinds: [], reading: { personal: { on: true, time: "06:30", days: [0,1,2,3,4,5,6] } } } as ReminderPrefs;
    const a = planReadingReminders(p, now);
    expect(a).toHaveLength(7);
    expect(a[0].at.getHours()).toBe(6);
    expect(a[0].at.getMinutes()).toBe(30);
    expect(planReadingReminders(p, now, { personal: "2026-11-02" })).toHaveLength(6);
  });
});
