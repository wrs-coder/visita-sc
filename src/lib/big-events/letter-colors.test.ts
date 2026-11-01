import { describe, it, expect } from "vitest";
import { LETTER_PRESETS, resolveLetterColors, sanitizeLetterColors, presetOf } from "./letter-template";
describe("cores da carta", () => {
  it("sem cores salvas mantém a carta clássica de hoje", () => {
    const r = resolveLetterColors(undefined);
    expect(r.title).toEqual([0.1, 0.31, 0.38]);
    expect(r.rule).toEqual([0.72, 0.6, 0.38]);
    expect(r.boxFill).toEqual([0.988, 0.976, 0.953]);
    expect(presetOf(undefined)).toBe("classica");
  });
  it("id inválido volta ao padrão", () => {
    expect(sanitizeLetterColors({ title: "rosa-choque", box: "vinho" }).title).toBe("petroleo");
    expect(sanitizeLetterColors({ box: "vinho" }).box).toBe("vinho");
  });
  it("cada paleta resolve as 4 partes; 'Sem cor' tira o fundo da caixa", () => {
    for (const p of LETTER_PRESETS) { const r = resolveLetterColors(p.colors); expect(r.title && r.box && r.info && r.rule).toBeTruthy(); }
    expect(resolveLetterColors(LETTER_PRESETS.find((p) => p.id === "semcor")!.colors).boxFill).toBeNull();
  });
});
