import { describe, it, expect } from "vitest";
import { needsTermsAcceptance, TERMS_VERSION } from "./terms-acceptance";
import { TERMS_SECTIONS } from "@/components/auth/terms-content";

describe("aceite dos Termos", () => {
  it("quem nunca aceitou precisa aceitar", () => {
    expect(needsTermsAcceptance(null)).toBe(true);
  });
  it("quem aceitou versão anterior precisa aceitar de novo", () => {
    expect(needsTermsAcceptance("2025-01-01")).toBe(true);
  });
  it("quem aceitou a versão atual não vê o aviso", () => {
    expect(needsTermsAcceptance(TERMS_VERSION)).toBe(false);
  });
  it("termos trazem contato e aviso de não afiliação", () => {
    const all = TERMS_SECTIONS.map(([, b]) => b).join(" ");
    expect(all).toContain("wrscircuito@gmail.com");
    expect(all).toContain("Não é afiliado");
  });
});
