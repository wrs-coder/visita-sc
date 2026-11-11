import { describe, expect, it } from "vitest";
import { externalLinkAction } from "./external-link";

describe("externalLinkAction", () => {
  it("no navegador com internet deixa o link abrir uma aba nova", () => {
    expect(externalLinkAction({ native: false, online: true })).toBe("browser");
  });
  it("no app instalado abre pelo navegador do sistema", () => {
    expect(externalLinkAction({ native: true, online: true })).toBe("native");
  });
  it("sem internet avisa, no app e no navegador", () => {
    expect(externalLinkAction({ native: true, online: false })).toBe("offline");
    expect(externalLinkAction({ native: false, online: false })).toBe("offline");
  });
});
