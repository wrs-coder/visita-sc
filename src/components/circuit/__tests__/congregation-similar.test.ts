import { describe, it, expect } from "vitest";
import { buildRows } from "../CongregationImportDialog";
const it_ = (name: string) => ({ name, number: null, likelyTitle: false }) as any;
describe("importação: nomes parecidos", () => {
  it("Jd. Alvorada × Jardim Alvorada vira parecida e mantém o código existente", () => {
    const [r] = buildRows([it_("Jardim Alvorada")], [{ id: "a", name: "Jd. Alvorada", invite_code: "48213" }]);
    expect(r.match?.id).toBe("a");
    expect(r.match?.code).toBe("48213");
    expect(r.action).toBe("keep");
    expect(r.checked).toBe(false);
  });
  it("Funda 1 × Funda 2 não é parecida", () => {
    const [r] = buildRows([it_("Funda 2")], [{ id: "a", name: "Funda 1", invite_code: "11111" }]);
    expect(r.match).toBeNull();
  });
  it("uma congregação do app só é alvo de uma linha", () => {
    const rows = buildRows([it_("Jardim Alvorada"), it_("Jardim Alvorada.")], [{ id: "a", name: "Jd Alvorada", invite_code: "48213" }]);
    expect(rows.filter((r) => r.match).length).toBe(1);
  });
});
