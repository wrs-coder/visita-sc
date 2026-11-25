import { describe, it, expect } from "vitest";
import { splitMinistryModality, joinMinistryModality, ministryModalityLabel, pushRemembered } from "./ministry-modality";

describe("Companhia (Ministério) — modalidade", () => {
  it("itens antigos sem modalidade mostram Estudos e Revisitas", () => {
    expect(ministryModalityLabel(null)).toBe("Estudos e Revisitas");
  });
  it("Outro guarda e mostra o texto digitado", () => {
    const v = joinMinistryModality("outro", "Testemunho público na feira");
    expect(v).toBe("outro:Testemunho público na feira");
    expect(ministryModalityLabel(v)).toBe("Testemunho público na feira");
    expect(splitMinistryModality(v)).toEqual({ key: "outro", other: "Testemunho público na feira" });
  });
  it("Outro sem texto não grava vazio", () => {
    expect(joinMinistryModality("outro", "  ")).toBe("estudos_revisitas");
  });
  it("lista fixa tem Testemunho com Carrinho", () => {
    expect(ministryModalityLabel("carrinho")).toBe("Testemunho com Carrinho");
  });
  it("lembra no máximo 8 textos, o mais recente primeiro, sem repetir", () => {
    let l: string[] = [];
    for (let i = 0; i < 10; i++) l = pushRemembered(l, `m${i}`);
    l = pushRemembered(l, "M5");
    expect(l.length).toBe(8);
    expect(l[0]).toBe("M5");
    expect(l.filter((x) => x.toLowerCase() === "m5").length).toBe(1);
  });
});
