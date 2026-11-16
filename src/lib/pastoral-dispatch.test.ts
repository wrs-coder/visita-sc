import { describe, it, expect } from "vitest";
import { parseSlotLabel, pastoralEventToNote, pastoralEventToSchedule } from "./pastoral-dispatch";

const visit = { id: "v", congregation_id: "c", start_date: "2026-11-10", end_date: "2026-11-16" };
const ev = {
  id: "e1", section: "pastoral", companion: "Ir. João", family_name: "Família Silva",
  family_members: "Ana, Pedro", address: "Rua A, 10", spiritual_info: "Desanimado",
  slot_label: "Domingo, 10:30",
} as never;

describe("parseSlotLabel", () => {
  it("Domingo, 10:30 → domingo da semana da visita e 10:30", () => {
    expect(parseSlotLabel("Domingo, 10:30", visit.start_date, visit.end_date)).toEqual({ date: "2026-11-15", time: "10:30" });
  });
  it("dom 10h30", () => {
    expect(parseSlotLabel("dom 10h30", visit.start_date, visit.end_date)).toEqual({ date: "2026-11-15", time: "10:30" });
  });
  it("Sáb. 9h → 09:00", () => {
    expect(parseSlotLabel("Sáb. 9h", visit.start_date, visit.end_date)).toEqual({ date: "2026-11-14", time: "09:00" });
  });
  it("Terça-feira – 19:00", () => {
    expect(parseSlotLabel("Terça-feira – 19:00", visit.start_date, visit.end_date)).toEqual({ date: "2026-11-10", time: "19:00" });
  });
  it("sem dia: só horário", () => {
    expect(parseSlotLabel("às 15:00", visit.start_date, visit.end_date)).toEqual({ time: "15:00" });
  });
  it("sem horário: só data", () => {
    expect(parseSlotLabel("Quarta", visit.start_date, visit.end_date)).toEqual({ date: "2026-11-11" });
  });
  it("dia fora da semana da visita fica sem data", () => {
    expect(parseSlotLabel("Segunda 10:00", "2026-11-10", "2026-11-12")).toEqual({ time: "10:00" });
  });
});

describe("pastoralEventToNote", () => {
  it("mapeia os campos do pastoreio para a nota", () => {
    const n = pastoralEventToNote(ev, visit);
    expect(n.companion).toBe("Ir. João");
    expect(n.involved_names).toBe("Família Silva — Ana, Pedro");
    expect(n.additional_info).toBe("Rua A, 10\nDesanimado");
    expect(n.note_date).toBe("2026-11-15");
    expect(n.payload.source_event_id).toBe("e1");
  });
});

describe("pastoralEventToSchedule", () => {
  it("usa a data e o horário de início lidos", () => {
    const s = pastoralEventToSchedule(ev, visit, "2026-11-16", "10:30");
    expect(s.event_date).toBe("2026-11-16");
    expect(s.start_time).toBe("10:30");
    expect(s.congregation_ids).toEqual(["c"]);
  });
});
