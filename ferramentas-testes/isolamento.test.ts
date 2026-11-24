// Guardião: as ferramentas do site (public/ferramentas) nunca entram no app VisitaSC.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const ROUTE = join("src", "routes", "ferramentas.$ferramenta.ts");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?|mjs)$/.test(n) ? [p] : [];
  });
}

describe("isolamento das ferramentas", () => {
  it("nenhum código do app importa public/ferramentas (exceto a rota que entrega o HTML)", () => {
    const bad = files(join(ROOT, "src"))
      .filter((f) => !f.endsWith(ROUTE) && !f.endsWith("routeTree.gen.ts"))
      .filter((f) => /from\s+["'][^"']*public\/ferramentas|require\(["'][^"']*public\/ferramentas/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
  it("a rota das ferramentas não importa nada do app", () => {
    const src = readFileSync(join(ROOT, ROUTE), "utf8");
    expect(src).not.toMatch(/from\s+["']@\//);
  });
  it("o modo offline do app ignora /ferramentas/", () => {
    expect(readFileSync(join(ROOT, "public", "sw.js"), "utf8")).toMatch(/startsWith\("\/ferramentas\/"\)\) return/);
  });
  it("o APK remove a pasta ferramentas", () => {
    expect(readFileSync(join(ROOT, "scripts", "build-app-shell.mjs"), "utf8")).toMatch(/path\.join\(outDir, "ferramentas"\)/);
  });
});

describe("instruções das ferramentas", () => {
  it("existe instructions-ferramentas.md e o instructions.md aponta para ele", () => {
    expect(readFileSync(join(ROOT, "instructions-ferramentas.md"), "utf8")).toMatch(/FERRAMENTAS DO SITE/);
    expect(readFileSync(join(ROOT, "instructions.md"), "utf8")).toMatch(/instructions-ferramentas\.md/);
  });
});
