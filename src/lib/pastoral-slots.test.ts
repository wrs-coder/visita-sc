import { describe, it, expect } from "vitest";
import { slotState, nextEventWithoutSlot, visitSlotOptions, customSlotLabel, slotTaken, visitWeekdays } from "./pastoral-slots";

const slots = ["Qua, 10:30", "Sáb, 19:00", "Dom, 10:00"];
describe("pílulas de pastoreio", () => {
  it("horário personalizado é atribuído e fica disponível sem mudar o modelo", () => {
    const events = [{ id: "a", slot_label: "Quinta-feira, 15:00" }];
    expect(visitSlotOptions(slots, events)).toEqual([...slots, "Quinta-feira, 15:00"]);
    expect(slots).toEqual(["Qua, 10:30", "Sáb, 19:00", "Dom, 10:00"]);
    expect(slotState(slots, events).remaining).toBe(0);
    expect(nextEventWithoutSlot(slots, events)).toBeUndefined();
  });
  it("edição livre aceita Quinta 15:00 só dentro da visita", () => {
    expect(customSlotLabel(4, "15:00", "2026-11-10", "2026-11-16")).toBe("Quinta-feira, 15:00");
    expect(customSlotLabel(4, "15:00", "2026-11-10", "2026-11-11")).toBeNull();
  });
  it("não aceita hora inválida", () => {
    expect(customSlotLabel(4, "25:00", "2026-11-10", "2026-11-16")).toBeNull();
    expect(customSlotLabel(4, "15:60", "2026-11-10", "2026-11-16")).toBeNull();
  });
  it("conflito reconhece o mesmo dia/hora com nomes diferentes", () => {
    expect(slotTaken("Quinta-feira, 15:00", new Set(["Qui 15h00"]))).toBe(true);
    expect(slotTaken("Quinta-feira, 15:30", new Set(["Qui 15h00"]))).toBe(false);
  });
  it("dias oferecidos pertencem à semana selecionada", () => {
    expect(visitWeekdays("2026-11-10", "2026-11-12")).toEqual([2, 3, 4]);
  });
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
