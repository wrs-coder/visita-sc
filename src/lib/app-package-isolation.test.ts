import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const temporaryDirs: string[] = [];
afterEach(() => {
  for (const dir of temporaryDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "visitasc-isolation-"));
  temporaryDirs.push(root);
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "dist-app", "assets"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "6.0.2" }));
  writeFileSync(join(root, "dist-app", "build-info.json"), JSON.stringify({ version: "6.0.2", builtAt: new Date().toISOString() }));
  writeFileSync(join(root, "dist-app", "index.html"), "<!doctype html><title>Visita SC</title>");
  return root;
}

function check(root: string) {
  return spawnSync(process.execPath, [resolve("scripts/check-shell-fresh.mjs")], { cwd: root, encoding: "utf8" });
}

describe("conferência dos arquivos reais do pacote Android", () => {
  it("aceita pacote Visita SC sem ferramentas", () => {
    expect(check(fixture()).status).toBe(0);
  });
  it.each(["S21_Export", "Analisador"])("bloqueia a pasta da ferramenta %s", (tool) => {
    const root = fixture();
    mkdirSync(join(root, "dist-app", "ferramentas", tool), { recursive: true });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Ferramenta do site encontrada");
  });
  it.each(["Conversor S-21", "Analisador de congregações", "/ferramentas/Analisador/", "S21_Export"])("bloqueia conteúdo incorporado: %s", (marker) => {
    const root = fixture();
    writeFileSync(join(root, "dist-app", "assets", "extra.js"), JSON.stringify(marker));
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Conteúdo de ferramenta");
  });
  it("bloqueia telas de versão antiga", () => {
    const root = fixture();
    writeFileSync(join(root, "dist-app", "build-info.json"), JSON.stringify({ version: "6.0.1", builtAt: new Date().toISOString() }));
    expect(check(root).status).toBe(1);
  });
});