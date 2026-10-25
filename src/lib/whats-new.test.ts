import { describe, expect, it } from "vitest";
import { WHATS_NEW_KEY, hasPreviousUse, shouldShowWhatsNew } from "./whats-new";

const base = { installed: "5.0.2", notesVersion: "5.0.2", seen: null, hadPreviousUse: true };

describe("shouldShowWhatsNew", () => {
  it("mostra na primeira abertura após atualizar", () => {
    expect(shouldShowWhatsNew(base)).toBe(true);
  });
  it("não mostra de novo depois de visto", () => {
    expect(shouldShowWhatsNew({ ...base, seen: "5.0.2" })).toBe(false);
  });
  it("não mostra em instalação nova", () => {
    expect(shouldShowWhatsNew({ ...base, hadPreviousUse: false })).toBe(false);
  });
  it("não mostra se a versão instalada é outra", () => {
    expect(shouldShowWhatsNew({ ...base, installed: "5.0.1" })).toBe(false);
  });
});

describe("hasPreviousUse", () => {
  it("instalação nova (sem dados do app) não conta como uso anterior", () => {
    expect(hasPreviousUse([])).toBe(false);
    expect(hasPreviousUse(["outra-coisa"])).toBe(false);
  });
  it("só a marca da própria janela não conta", () => {
    expect(hasPreviousUse([WHATS_NEW_KEY])).toBe(false);
  });
  it("qualquer dado do app conta (PIN, preferências, sessão)", () => {
    expect(hasPreviousUse(["visita-sc:outline-meta-collapsed"])).toBe(true);
    expect(hasPreviousUse(["sb-abc-auth-token"])).toBe(true);
  });
});
