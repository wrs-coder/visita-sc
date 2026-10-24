import { describe, expect, it } from "vitest";
import { planReminders, type ReminderPrefs } from "./event-reminders";
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
