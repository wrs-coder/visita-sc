import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("caixas de confirmação", () => {
  it("o app nunca usa a caixa nativa do navegador (só appConfirm)", () => {
    const bad = files("src")
      .filter((f) => !f.endsWith("app-dialogs.tsx"))
      .filter((f) => /(^|[^\w.])(window\.)?confirm\(/m.test(readFileSync(f, "utf8").replace(/appConfirm\(/g, "")));
    expect(bad).toEqual([]);
  });
});
