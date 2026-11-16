import { describe, it, expect } from "vitest";
import { readPastoralOutline, pastoralOutlineText } from "./pastoral-outline";

describe("pastoral outline", () => {
  it("nota antiga sem esboço abre vazia", () => {
    expect(readPastoralOutline(null)).toEqual({ html: "", attachments: [] });
    expect(readPastoralOutline({ source_event_id: "x" })).toEqual({ html: "", attachments: [] });
  });
  it("lê esboço e anexos", () => {
    const r = readPastoralOutline({ outline_html: "<p>Oi</p>", attachments: [{ id: "a" }] });
    expect(r.html).toBe("<p>Oi</p>");
    expect(r.attachments).toHaveLength(1);
  });
  it("texto simples para exportar", () => {
    expect(pastoralOutlineText({ outline_html: "<p>Salmo 23:1</p><p>Ponto &amp; fim</p>" })).toBe("Salmo 23:1\nPonto & fim");
  });
});
