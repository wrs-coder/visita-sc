import { describe, it, expect } from "vitest";
import { visibleTemplateDays, clampActiveDay } from "./template-day-pills";

describe("pílulas de dias dos modelos", () => {
  it("terça e segunda ficam escondidas por padrão", () => {
    expect(visibleTemplateDays(false, false)).toEqual([1, 2, 3, 4, 5]);
  });
  it("segunda aparece quando o usuário ativa", () => {
    expect(visibleTemplateDays(true, false)).toContain(6);
  });
  it("segunda aparece quando o modelo já tem itens nela", () => {
    expect(visibleTemplateDays(false, true)).toContain(6);
  });
  it("terça aparece no início quando o usuário ativa", () => {
    expect(visibleTemplateDays(false, false, true, false)[0]).toBe(0);
  });
  it("terça aparece com itens quando o usuário nunca escolheu", () => {
    expect(visibleTemplateDays(false, false, null, true)).toContain(0);
  });
  it("terça desligada pelo usuário fica escondida mesmo com itens", () => {
    expect(visibleTemplateDays(false, false, false, true)).not.toContain(0);
  });
  it("dia escolhido volta para quarta se a terça sumir", () => {
    expect(clampActiveDay(0, [1, 2, 3, 4, 5])).toBe(1);
  });
  it("dia escolhido volta para o primeiro visível se a segunda sumir", () => {
    expect(clampActiveDay(6, [1, 2, 3, 4, 5])).toBe(1);
  });
});
