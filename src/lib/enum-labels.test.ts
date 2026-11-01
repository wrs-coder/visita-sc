import { describe, it, expect } from "vitest";
import { encouragementCategoryLabel, humanizeCode, modalityLabel, recommendationPurposeLabel } from "./enum-labels";
describe("rótulos em português", () => {
  it("categoria do encorajamento", () => { expect(encouragementCategoryLabel("sick")).toBe("Doente"); expect(encouragementCategoryLabel("inactive")).toBe("Inativo"); });
  it("propósito da recomendação", () => { expect(recommendationPurposeLabel("ministerial_servant")).toBe("Servo ministerial"); expect(recommendationPurposeLabel("cca_change")).toBe("Mudança de CCA"); });
  it("modalidade e códigos desconhecidos", () => {
    expect(modalityLabel("grupo_de_campo")).toBe("Grupo de campo");
    expect(humanizeCode("algo_novo")).toBe("Algo novo");
    expect(humanizeCode("Texto livre")).toBe("Texto livre");
  });
});
