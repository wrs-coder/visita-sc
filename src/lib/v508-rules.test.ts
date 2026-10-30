import { describe, expect, it } from "vitest";
import { shouldHide } from "./use-hide-on-scroll";
import { splitBlobForBridge, BRIDGE_CHUNK_BYTES } from "./share";
import { describeLocalSaveError } from "./save-errors";
import { describeSyncError, pullTable } from "./local-sync";
import { RELEASE_HISTORY } from "./release-notes";

describe("5.0.8", () => {
  it("cabeçalho fica visível perto do topo e some ao rolar para baixo", () => {
    expect(shouldHide(0, 40, true)).toBe(false);
    expect(shouldHide(100, 200, false)).toBe(true);
    expect(shouldHide(300, 200, true)).toBe(false);
  });
  it("exportação divide arquivo grande em partes múltiplas de 3 bytes", () => {
    expect(BRIDGE_CHUNK_BYTES % 3).toBe(0);
    const parts = splitBlobForBridge(new Blob([new Uint8Array(BRIDGE_CHUNK_BYTES * 2 + 5)]));
    expect(parts.map((p) => p.size)).toEqual([BRIDGE_CHUNK_BYTES, BRIDGE_CHUNK_BYTES, 5]);
  });
  it("falta de espaço vira mensagem clara", () => {
    expect(describeLocalSaveError(Object.assign(new Error("x"), { name: "QuotaExceededError" }))).toMatch(/Espaço do aparelho cheio/);
  });
  it("erro do backend mostra o motivo, não [object Object]", () => {
    expect(describeSyncError({ message: "timeout", code: "57014" })).toBe("timeout · 57014");
  });
  it("sincronização tenta de novo a tabela que falhou", async () => {
    let n = 0;
    const res = await pullTable("talk_themes_test", async () => { n++; if (n < 2) throw { message: "rede" }; return []; }, true, [0]);
    expect(res.ok).toBe(true);
    expect(n).toBe(2);
  });
  it("novidades especiais reúnem 5.0.5 a 5.0.8 em uma entrada", () => {
    expect(RELEASE_HISTORY[0].version).toBe("5.0.8");
    expect(RELEASE_HISTORY.map((r) => r.version)).not.toContain("5.0.7");
    expect(RELEASE_HISTORY[1].version).toBe("5.0.4");
  });
});
