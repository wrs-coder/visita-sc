import { describe, it, expect } from "vitest";
import sample from "./sample.etim.json";
import { parseEtim } from "./etim-import";
import { buildInviteText, generatePin, hashPin, isValidPin, nextSpeakerName, type InvitePart } from "./invite";
import { isLocked, nextAttemptState, MAX_EVENT_FAILS } from "./lockout";

describe("parseEtim (arquivo real da assembleia)", () => {
  const parts = parseEtim(JSON.stringify(sample));
  it("lê horário, tempo, tema e esboço", () => {
    expect(parts[2]).toMatchObject({ part_time: "10:00", duration_min: 14, outline_number: "1", part_type_id: "T", assigned_to: "speaker" });
  });
  it("marca parte do SC e cântico sem convite", () => {
    expect(parts[1].assigned_to).toBe("co");
    expect(parts[5].assigned_to).toBe("none");
  });
  it("recusa arquivo sem partes", () => {
    expect(() => parseEtim("{}")).toThrow();
  });
});

describe("PIN", () => {
  it("aceita só 4 a 6 números", () => {
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
  it("gera PIN válido", () => { expect(isValidPin(generatePin(6))).toBe(true); });
  it("hash depende do evento: mesmo PIN em eventos diferentes não colide", async () => {
    expect(await hashPin("1234", "a")).toBe(await hashPin("1234", "a"));
    expect(await hashPin("1234", "a")).not.toBe(await hashPin("1234", "b"));
  });
});

describe("bloqueio por tentativas", () => {
  it(`bloqueia 15 min após ${MAX_EVENT_FAILS} erros no evento`, () => {
    const now = 1_000_000;
    const s = nextAttemptState({ failed_attempts: MAX_EVENT_FAILS - 1, locked_until: null }, false, now);
    expect(s.failed_attempts).toBe(0);
    expect(isLocked(s.locked_until, now + 14 * 60_000)).toBe(true);
    expect(isLocked(s.locked_until, now + 16 * 60_000)).toBe(false);
  });
  it("acerto zera os erros", () => {
    expect(nextAttemptState({ failed_attempts: 5, locked_until: null }, true, 0)).toEqual({ failed_attempts: 0, locked_until: null });
  });
});

describe("próximo orador no convite", () => {
  const base = { duration_min: 10, outline_number: null, instructions: null, part_type_label: null, part_time: null, theme: "T" };
  const parts: InvitePart[] = [
    { ...base, id: "a", sort_order: 0, assigned_to: "speaker", speaker_name: "João", show_next_speaker: true },
    { ...base, id: "b", sort_order: 1, assigned_to: "none", speaker_name: null, show_next_speaker: false },
    { ...base, id: "c", sort_order: 2, assigned_to: "speaker", speaker_name: "Pedro", show_next_speaker: false },
  ];
  const ev = { name: "Assembleia", event_date: "2027-03-14", location: null, extra_info: null, public_token: "tok" };
  it("pula o cântico e acha Pedro", () => { expect(nextSpeakerName(parts, "a")).toBe("Pedro"); });
  it("só aparece quando a caixinha está marcada", () => {
    expect(buildInviteText(ev, parts[0], parts, "1234", "https://x")).toContain("Próximo orador: Pedro");
    expect(buildInviteText(ev, { ...parts[0], show_next_speaker: false }, parts, "1234", "https://x")).not.toContain("Próximo orador");
  });
});

import { recomputeTimes } from "./invite";
describe("edição de partes e modo de link", () => {
  const p = (id: string, o: number, dur: number, mode = "auto", t: string | null = null) => ({ id, sort_order: o, duration_min: dur, time_mode: mode, part_time: t });
  it("automático soma a parte anterior a partir do início", () => {
    expect(recomputeTimes("09:40", [p("a", 0, 15), p("b", 1, 10), p("c", 2, 5)]).map((x) => x.part_time)).toEqual(["09:40", "09:55", "10:05"]);
  });
  it("manual mantém a hora e vira nova base", () => {
    expect(recomputeTimes("09:40", [p("a", 0, 15), p("b", 1, 10, "manual", "11:00"), p("c", 2, 5)]).map((x) => x.part_time)).toEqual(["09:40", "11:00", "11:10"]);
  });
  const ev = { name: "AC", event_date: null, location: null, extra_info: null, public_token: "EVT" };
  const part = { id: "a", sort_order: 0, part_time: null, duration_min: null, theme: "T", outline_number: null, instructions: "Traga o esboço",
    part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "João", speaker_congregation: "Central", show_next_speaker: true, personal_token: "PERS" };
  const next = { ...part, id: "b", sort_order: 1, speaker_name: "Pedro", speaker_congregation: "Vila Nova", instructions: null };
  it("convite leva congregação, info individual e congregação do próximo orador", () => {
    const t = buildInviteText(ev, part, [part, next], "1234", "https://x");
    expect(t).toContain("Orador: João — Central");
    expect(t).toContain("Traga o esboço");
    expect(t).toContain("Próximo orador: Pedro — Vila Nova");
    expect(t).toContain("https://x/confirmar/EVT");
    expect(t).toContain("PIN: 1234");
  });
  it("modo link pessoal usa o link do orador e não envia PIN", () => {
    const t = buildInviteText({ ...ev, link_mode: "personal" }, part, [part], "1234", "https://x");
    expect(t).toContain("https://x/confirmar/PERS");
    expect(t).not.toContain("PIN");
    expect(t).not.toContain("/confirmar/EVT");
  });
});
