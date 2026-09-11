import { describe, expect, it } from "vitest";

import { API_ORIGINS, apiOriginAttempts, rankApiOrigins } from "./api-origin";

describe("rankApiOrigins", () => {
  it("prioriza o domínio próprio quando não há preferência salva", () => {
    expect(rankApiOrigins(null)).toEqual([
      "https://visitasc.com.br",
      "https://www.visitasc.com.br",
      "https://visita-sc.lovable.app",
    ]);
  });

  it("mantém uma origem conhecida salva e preserva todas as alternativas", () => {
    expect(rankApiOrigins("https://www.visitasc.com.br")).toEqual([
      "https://www.visitasc.com.br",
      "https://visitasc.com.br",
      "https://visita-sc.lovable.app",
    ]);
  });

  it("ignora origens salvas que não pertencem à lista aprovada", () => {
    expect(rankApiOrigins("https://example.com")).toEqual([...API_ORIGINS]);
  });

  it("tenta as três origens quando a preferida falha", () => {
    expect(apiOriginAttempts("https://visita-sc.lovable.app")).toEqual([
      "https://visita-sc.lovable.app",
      "https://visitasc.com.br",
      "https://www.visitasc.com.br",
    ]);
  });
});