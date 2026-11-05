import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const md = readFileSync(path.join(root, "instructions.md"), "utf8");

describe("instructions.md — trava e regra da Ajuda", () => {
  it("mantém a lista de código protegido e todos os arquivos existem", () => {
    const m = md.match(/<!-- PROTECTED-FILES:START -->([\s\S]*?)<!-- PROTECTED-FILES:END -->/);
    expect(m).not.toBeNull();
    const files = m![1].split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
    expect(files.length).toBeGreaterThanOrEqual(13);
    for (const f of ["src/lib/epub-bible-parser.ts", "src/hooks/use-outlines-sync.ts", "src/lib/local-first-fetch.ts"]) expect(files).toContain(f);
    for (const f of files) expect(existsSync(path.join(root, f)), f).toBe(true);
  });
  it("exige atualizar a Ajuda", () => {
    expect(md).toMatch(/## 30\. Ajuda Sempre Atualizada/);
    expect(md).toMatch(/9\. A "Ajuda" do app foi atualizada/);
  });
});
