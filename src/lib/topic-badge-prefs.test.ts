import { describe, expect, it } from "vitest";
import { DEFAULT_BADGE_PREFS, normalizeBadgePrefs } from "./topic-badge-prefs";

describe("normalizeBadgePrefs", () => {
  it("mantém valores válidos", () => {
    expect(normalizeBadgePrefs({ size: "lg", opacity: 85, position: "left" })).toEqual({ size: "lg", opacity: 85, position: "left" });
  });
  it("opacidade fora de 30–100 volta ao padrão de 60", () => {
    expect(normalizeBadgePrefs({ opacity: 10 }).opacity).toBe(60);
    expect(normalizeBadgePrefs({ opacity: 150 }).opacity).toBe(60);
  });
  it("valores inválidos voltam ao padrão (pequeno, direita)", () => {
    expect(normalizeBadgePrefs({ size: "xl", position: "top" })).toEqual(DEFAULT_BADGE_PREFS);
    expect(DEFAULT_BADGE_PREFS).toEqual({ size: "sm", opacity: 60, position: "right" });
  });
});
