import { describe, it, expect } from "vitest";
import { infoSavePatch } from "./info-autodone";
describe("checklist: Informação preenchida marca concluída", () => {
  it("com texto marca concluída", () => expect(infoSavePatch("84 publicadores").status).toBe("done"));
  it("vazio ou só espaços não mexe na marcação", () => {
    expect(infoSavePatch("").status).toBeUndefined();
    expect(infoSavePatch("   ").status).toBeUndefined();
  });
});
