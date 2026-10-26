import { describe, expect, it } from "vitest";
import { pickDeviceLanguage } from "./index";
describe("pickDeviceLanguage", () => {
  it("usa o idioma do aparelho", () => {
    expect(pickDeviceLanguage(["en-US"])).toBe("en");
    expect(pickDeviceLanguage(["es-ES"])).toBe("es");
    expect(pickDeviceLanguage(["pt-BR"])).toBe("pt");
  });
  it("idioma não suportado cai no Português, ou no próximo suportado", () => {
    expect(pickDeviceLanguage(["fr-FR"])).toBe("pt");
    expect(pickDeviceLanguage(["fr-FR", "es"])).toBe("es");
  });
});
