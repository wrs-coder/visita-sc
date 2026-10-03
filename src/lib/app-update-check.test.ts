import { describe, expect, it } from "vitest";

import { compareVersions } from "@/lib/app-update-check";

describe("compareVersions", () => {
  it("retorna 0 para versões iguais", () => {
    expect(compareVersions("4.2.11", "4.2.11")).toBe(0);
  });

  it("detecta versão mais nova no patch", () => {
    expect(compareVersions("4.2.12", "4.2.11")).toBeGreaterThan(0);
    expect(compareVersions("4.2.11", "4.2.12")).toBeLessThan(0);
  });

  it("detecta versão mais nova no minor e major", () => {
    expect(compareVersions("4.3.0", "4.2.99")).toBeGreaterThan(0);
    expect(compareVersions("5.0.0", "4.9.9")).toBeGreaterThan(0);
  });

  it("trata segmentos ausentes como zero", () => {
    expect(compareVersions("4.2", "4.2.0")).toBe(0);
    expect(compareVersions("4.2.1", "4.2")).toBeGreaterThan(0);
  });

  it("ignora segmentos não numéricos", () => {
    expect(compareVersions("4.2.x", "4.2.0")).toBe(0);
  });
});
