import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const D = join(process.cwd(), "public", "ferramentas", "Analisador");
describe("Analisador sem internet", () => {
  it("guarda só arquivos das ferramentas, nunca do app", () => {
    const sw = readFileSync(join(D, "sw.js"), "utf8");
    const files = [...sw.matchAll(/"(\/[^"]+)"/g)].map((m) => m[1] ?? "");
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) expect(f.startsWith("/ferramentas/")).toBe(true);
  });
  it("registra com escopo só da pasta do Analisador", () => {
    const html = readFileSync(join(D, "index.html"), "utf8");
    expect(html).toContain('scope:"/ferramentas/Analisador/"');
  });
});
