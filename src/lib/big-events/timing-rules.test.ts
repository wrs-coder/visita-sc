import { describe, it, expect } from "vitest";
import { advanceMin, recomputeTimes } from "./invite";
import { parseDurationInput } from "@/components/circuit/BigEvents";

describe("regras de tempo", () => {
  it("9, 14 e 19 min ganham 1 min de transição", () => {
    expect([9, 14, 19, 8, 10].map(advanceMin)).toEqual([10, 15, 20, 8, 10]);
  });
  it("horário automático após parte de 9 min começa 10 min depois", () => {
    const r = recomputeTimes("10:15", [
      { id: "a", sort_order: 1, part_time: null, duration_min: 9 },
      { id: "b", sort_order: 2, part_time: null, duration_min: 8 },
      { id: "c", sort_order: 3, part_time: null, duration_min: 5 },
    ]);
    expect(r.map((x) => x.part_time)).toEqual(["10:15", "10:25", "10:33"]);
  });
  it("campo do cartão aceita 1 a 240 min", () => {
    expect(parseDurationInput("9")).toBe(9);
    expect(parseDurationInput("0")).toBeNull();
    expect(parseDurationInput("241")).toBeNull();
    expect(parseDurationInput("a")).toBeNull();
  });
});
