import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const loaded = createRequire(import.meta.url)("../public/ferramentas/S21_Export/converter.js") as unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const S = (loaded && typeof loaded === "object" && "toIso" in loaded ? loaded : (globalThis as Record<string, unknown>)["S21"]) as any;

describe("Conversor S-21 — datas em qualquer formato", () => {
  it("dd/mm/aaaa", () => expect(S.toIso("06/05/1986")).toBe("1986-05-06"));
  it("ano com 2 dígitos 86 vira 1986", () => expect(S.toIso("6-5-86")).toBe("1986-05-06"));
  it("sem separador", () => expect(S.toIso("06051986")).toBe("1986-05-06"));
  it("por extenso", () => expect(S.toIso("06 DE MAIO DE 1986")).toBe("1986-05-06"));
  it("abreviado", () => expect(S.toIso("15 de mai. 1990")).toBe("1990-05-15"));
  it("data inválida vira aviso", () => {
    const p = S.fromFields({ "900_1_Text_SanSerif": "Ana Silva", "900_2_Text_SanSerif": "31/02/1990" }, "a.pdf");
    expect(p.birth).toBe("");
    expect(S.warnings(p).some((w: string) => w.startsWith("Nascimento não entendido"))).toBe(true);
    S.setDate(p, "birth", "28/02/1990");
    expect(p.birth).toBe("1990-02-28");
    expect(S.warnings(p).some((w: string) => w.startsWith("Nascimento não entendido"))).toBe(false);
  });
});
