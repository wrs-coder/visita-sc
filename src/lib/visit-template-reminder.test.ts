import { describe, it, expect } from "vitest";
import { pickVisitsNeedingTemplates } from "./visit-template-reminder";

const today = new Date(2026, 9, 26); // 26 out 2026
const v = (id: string, start: string, extra: Record<string, string | null> = {}) => ({
  id, start_date: start, congregation_id: "c", ...extra,
});

describe("pickVisitsNeedingTemplates", () => {
  it("avisa visita sem modelo que começa em até 2 meses (60 dias)", () => {
    const r = pickVisitsNeedingTemplates([v("a", "2026-12-25"), v("b", "2026-12-26")], today);
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
  it("não avisa se já houver algum modelo", () => {
    expect(pickVisitsNeedingTemplates([v("a", "2026-11-10", { checklist_template_id: "x" })], today)).toEqual([]);
  });
  it("não avisa visita já iniciada ou passada", () => {
    expect(pickVisitsNeedingTemplates([v("a", "2026-10-26"), v("b", "2026-10-01")], today)).toEqual([]);
  });
});
