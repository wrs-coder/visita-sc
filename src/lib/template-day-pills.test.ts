import { describe, it, expect } from "vitest";
import { visibleTemplateDays, clampActiveDay } from "./template-day-pills";

describe("pílulas de dias dos modelos", () => {
  it("segunda fica escondida por padrão", () => {
    expect(visibleTemplateDays(false, false)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("segunda aparece quando o usuário ativa", () => {
    expect(visibleTemplateDays(true, false)).toContain(6);
  });
  it("segunda aparece quando o modelo já tem itens nela", () => {
    expect(visibleTemplateDays(false, true)).toContain(6);
  });
  it("dia escolhido volta para o 1º dia se a segunda sumir", () => {
    expect(clampActiveDay(6, [0, 1, 2, 3, 4, 5])).toBe(0);
  });
});
