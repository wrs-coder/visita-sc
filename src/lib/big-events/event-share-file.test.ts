import { describe, expect, it } from "vitest";
import { buildEventFile, parseEventFile } from "./event-share-file";

describe("arquivo de evento entre aparelhos", () => {
  it("leva programa e designados, nunca PIN ou links", () => {
    const part = { part_time: "10:15", duration_min: null, theme: "Série — Baraque", outline_number: null, instructions: null, part_type_id: null,
      part_type_label: null, symposium: true, talk_includes: [], assigned_to: "speaker", time_mode: "auto", speaker_name: "João", speaker_congregation: "Centro",
      sort_order: 0, pin_hash: "abc", personal_token: "tok", personal_code: "XYZ" };
    const file = JSON.parse(JSON.stringify(buildEventFile({ name: "Assembleia", event_type: "assembly", event_date: "2026-11-14", location: "Salão", extra_info: null, start_time: "09:40" }, [part])));
    const txt = JSON.stringify(file);
    expect(txt).not.toContain("abc"); expect(txt).not.toContain("tok"); expect(txt).not.toContain("XYZ");
    const r = parseEventFile(file);
    expect(r.event.name).toBe("Assembleia");
    expect(r.parts[0]).toMatchObject({ theme: "Série — Baraque", duration_min: null, symposium: true, speaker_name: "João", speaker_congregation: "Centro" });
  });
  it("recusa arquivo que não é do Visita SC", () => {
    expect(() => parseEventFile({ Programas: [] })).toThrow();
  });
});
