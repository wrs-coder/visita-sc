import { describe, expect, it } from "vitest";
import { fieldVisible, missingFieldCount } from "@/lib/field-requested";

describe("itens do Campo pedidos aos anciãos", () => {
  it("só os itens marcados aparecem para os anciãos", () => {
    const r = { modality: "casa_em_casa", requested_fields: ["territory_number"] };
    expect(fieldVisible(r, "territory_number", false)).toBe(true);
    expect(fieldVisible(r, "closing_prayer", false)).toBe(false);
    expect(fieldVisible(r, "auxiliary_leaders", false)).toBe(false);
  });
  it("nada marcado: nenhum item opcional aparece", () => {
    const r = { modality: "casa_em_casa", requested_fields: [] };
    expect(fieldVisible(r, "territory_location", false)).toBe(false);
  });
  it("o superintendente sempre vê todos os itens", () => {
    expect(fieldVisible({ requested_fields: [] }, "closing_prayer", true)).toBe(true);
  });
  it("visita antiga (sem marcação) mantém o que já aparecia", () => {
    expect(fieldVisible({ modality: "casa_em_casa", requested_fields: null }, "territory_number", false)).toBe(true);
    expect(fieldVisible({ modality: "telefone", requested_fields: null }, "territory_number", false)).toBe(false);
    expect(fieldVisible({ modality: "telefone", requested_fields: null }, "closing_prayer", false)).toBe(true);
  });
  it("conta local vazio e itens pedidos vazios", () => {
    expect(missingFieldCount([{ requested_fields: ["closing_prayer"], meeting_location: "", closing_prayer: "" }])).toBe(2);
    expect(missingFieldCount([{ requested_fields: ["closing_prayer"], meeting_location: "Salão", closing_prayer: "João" }])).toBe(0);
  });
});
