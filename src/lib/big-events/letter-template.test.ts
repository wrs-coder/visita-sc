import { describe, expect, it } from "vitest";
import { buildLetterModel, defaultTemplate, letterFileBase } from "./letter-template";
import { letterPdf } from "./letter-render";

const ev = { name: "Assembleia de Circuito 2027", event_date: "2026-11-07", location: "SAV", extra_info: null, public_token: "11111111-1111-1111-1111-111111111111", public_code: "k7m9p2xa", link_mode: "pin" };
const part = { id: "a", sort_order: 0, part_time: "09:40", duration_min: 10, theme: "Confie em Jeová", outline_number: "7", instructions: null,
  part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "Gonçalves Da Justino", speaker_congregation: "C.Funda 01", show_next_speaker: false,
  personal_token: "22222222-2222-2222-2222-222222222222", personal_code: "abcd2345" };

describe("carta convite", () => {
  it("quadro vem do evento e da parte, com link curto e PIN", () => {
    const m = buildLetterModel(defaultTemplate(), ev, part, [part], "079382");
    expect(m.recipientName).toBe("Gonçalves Da Justino");
    expect(m.box).toContain("Local: SAV");
    expect(m.box).toContain("Sua designação: Parte Nº 7 · 09:40 · 10 min");
    expect(m.linkUrl).toBe("https://visitasc.com.br/c/k7m9p2xa");
    expect(m.pinLine).toContain("079382");
  });
  it("link pessoal usa o código do orador e não mostra PIN", () => {
    const m = buildLetterModel(defaultTemplate(), { ...ev, link_mode: "personal" }, part, [part], "079382");
    expect(m.linkUrl).toBe("https://visitasc.com.br/c/abcd2345");
    expect(m.pinLine).toBeNull();
  });
  it("arquivo: discurso pelo número, oração pelo tipo", () => {
    expect(letterFileBase(part)).toBe("07 - Gonçalves Da Justino - C.Funda 01");
    expect(letterFileBase({ ...part, outline_number: null, part_type_label: "Oração" })).toBe("Oração - Gonçalves Da Justino - C.Funda 01");
  });
  it("PDF tem link ativo para o convite", async () => {
    const bytes = await letterPdf(buildLetterModel(defaultTemplate(), ev, part, [part], "079382"));
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("/URI");
    expect(raw).toContain("visitasc.com.br/c/k7m9p2xa");
  });
});
