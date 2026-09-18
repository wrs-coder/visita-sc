import { describe, expect, it } from "vitest";

import { corsHeaders, isAllowedOrigin } from "./cors";

describe("CORS do aplicativo instalado", () => {
  it("autoriza a origem local do Capacitor e os cabeçalhos reais das server functions", () => {
    expect(isAllowedOrigin("https://localhost")).toBe(true);
    const headers = corsHeaders("https://localhost");
    const allowed = headers["Access-Control-Allow-Headers"].toLowerCase();
    expect(allowed).toContain("x-tsr-serverfn");
    expect(allowed).toContain("x-tss-raw");
    expect(allowed).toContain("x-tss-context");
    expect(allowed).toContain("x-visita-sc-transport");
  });

  it("não autoriza origens desconhecidas", () => {
    expect(isAllowedOrigin("https://example.com")).toBe(false);
  });
});