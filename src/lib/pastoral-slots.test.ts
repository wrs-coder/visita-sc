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

import { pickElderSlot, NO_SLOT } from "./pastoral-slots";
describe("um dia por vez", () => {
  it("abre no 1º dia escolhido", () => expect(pickElderSlot(["Qua", "Sáb"], null, true)).toBe("Qua"));
  it("sem dias escolhidos mostra os sem dia", () => expect(pickElderSlot([], null, true)).toBe(NO_SLOT));
  it("dia liberado volta ao 1º", () => expect(pickElderSlot(["Sáb"], "Qua", false)).toBe("Sáb"));
  it("mantém o atual", () => expect(pickElderSlot(["Qua", "Sáb"], "Sáb", false)).toBe("Sáb"));
});
