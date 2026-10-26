import { describe, it, expect } from "vitest";
import { slotState, nextEventWithoutSlot } from "./pastoral-slots";

const slots = ["Qua, 10:30", "Sáb, 19:00", "Dom, 10:00"];
describe("pílulas de pastoreio", () => {
  it("2 eventos e 3 dias: bloqueia após escolher 2", () => {
    const s = slotState(slots, [{ id: "a", slot_label: "Qua, 10:30" }, { id: "b", slot_label: "Sáb, 19:00" }]);
    expect(s.full).toBe(true);
    expect(s.free).toEqual(["Dom, 10:00"]);
  });
  it("ainda falta escolher 1", () => {
    const ev = [{ id: "a", slot_label: "Qua, 10:30" }, { id: "b", slot_label: null }];
    expect(slotState(slots, ev).remaining).toBe(1);
    expect(nextEventWithoutSlot(slots, ev)?.id).toBe("b");
  });
});
