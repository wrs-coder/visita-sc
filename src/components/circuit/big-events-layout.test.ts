import { describe, expect, it } from "vitest";
import { autoNextSpeaker, groupRuns } from "./BigEvents";

describe("próximo orador automático", () => {
  const s = (symposium: boolean, assigned_to = "speaker") => ({ symposium, assigned_to });
  it("marca todos do simpósio menos o último", () => {
    const l = [s(false, "none"), s(true), s(true), s(true), s(false)];
    expect(l.map((_, i) => autoNextSpeaker(l, i))).toEqual([false, true, true, false, false]);
  });
});

describe("partes sem orador agrupadas", () => {
  it("junta partes seguidas sem orador", () => {
    const r = groupRuns([{ assigned_to: "none" }, { assigned_to: "none" }, { assigned_to: "speaker" }, { assigned_to: "none" }], true);
    expect(r.map((x) => [x.group, x.parts.length])).toEqual([[true, 2], [false, 1], [true, 1]]);
  });
  it("não agrupa quando há filtro", () => {
    expect(groupRuns([{ assigned_to: "none" }], false)[0].group).toBe(false);
  });
});
