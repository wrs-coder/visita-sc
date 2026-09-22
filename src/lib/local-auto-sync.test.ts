import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/local-sync", () => ({
  syncTables: vi.fn(async () => [
    { table: "congregations", rows: 2, ok: true },
    { table: "meals", rows: 1, ok: true },
  ]),
  supabasePull: vi.fn(),
  supabaseTombstones: vi.fn(),
}));

import { syncTables } from "@/lib/local-sync";
import { __resetLocalDbForTests } from "@/lib/local-db";
import {
  __resetAutoSyncForTests,
  currentSyncWindow,
  getAutoSyncState,
  runAutoSync,
  runFullSync,
  subscribeAutoSync,
} from "@/lib/local-auto-sync";

describe("local-auto-sync (Fase 4)", () => {
  beforeEach(() => {
    __resetAutoSyncForTests();
    __resetLocalDbForTests();
    vi.clearAllMocks();
    vi.useRealTimers();
    Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true });
  });

  it("executa e registra sucesso com total de linhas", async () => {
    const results = await runAutoSync({ force: true });
    expect(results).toHaveLength(2);
    const s = getAutoSyncState();
    expect(s.running).toBe(false);
    expect(s.lastOk).toBe(true);
    expect(s.lastRows).toBe(3);
    expect(s.lastRunAt).toBeTruthy();
  });

  it("não roda em paralelo", async () => {
    let release: () => void = () => {};
    vi.mocked(syncTables).mockImplementationOnce(
      () => new Promise((res) => { release = () => res([]); }),
    );
    const p1 = runAutoSync({ force: true });
    const p2 = await runAutoSync({ force: true });
    expect(p2).toBeNull();
    release();
    await p1;
  });

  it("notifica assinantes sobre mudanças de estado", async () => {
    const seen: boolean[] = [];
    const stop = subscribeAutoSync((s) => seen.push(s.running));
    await runAutoSync({ force: true });
    stop();
    expect(seen).toContain(true);
    expect(seen[seen.length - 1]).toBe(false);
  });

  it("registra erro sem lançar exceção", async () => {
    vi.mocked(syncTables).mockRejectedValueOnce(new Error("rede"));
    const r = await runAutoSync({ force: true });
    expect(r).toBeNull();
    const s = getAutoSyncState();
    expect(s.lastOk).toBe(false);
    expect(s.error).toBe("rede");
  });

  describe("janelas diárias (2x ao dia)", () => {
    it("identifica as janelas corretamente", () => {
      const at = (h: number, m = 0) => new Date(2026, 8, 22, h, m);
      expect(currentSyncWindow(at(0))).toBeNull();
      expect(currentSyncWindow(at(5, 59))).toBeNull();
      expect(currentSyncWindow(at(6))).toBe("morning");
      expect(currentSyncWindow(at(11, 59))).toBe("morning");
      expect(currentSyncWindow(at(12))).toBe("afternoon");
      expect(currentSyncWindow(at(23, 59))).toBe("afternoon");
    });

    it("sem force, roda 1x na janela da manhã e ignora repetições no mesmo dia", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 8, 0));
      const r1 = await runAutoSync();
      expect(r1).not.toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(1);
      vi.setSystemTime(new Date(2026, 8, 22, 10, 30));
      const r2 = await runAutoSync();
      expect(r2).toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(1);
    });

    it("roda de novo na janela da tarde do mesmo dia", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 7, 0));
      await runAutoSync();
      vi.setSystemTime(new Date(2026, 8, 22, 15, 0));
      const r = await runAutoSync();
      expect(r).not.toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(2);
    });

    it("não roda automaticamente fora das janelas (madrugada)", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 2, 0));
      const r = await runAutoSync();
      expect(r).toBeNull();
      expect(syncTables).not.toHaveBeenCalled();
    });

    it("virada de dia libera a janela novamente", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 8, 0));
      await runAutoSync();
      vi.setSystemTime(new Date(2026, 8, 23, 8, 0));
      const r = await runAutoSync();
      expect(r).not.toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(2);
    });

    it("manual (force) ignora janela e não consome a janela automática", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 3, 0)); // madrugada
      const manual = await runAutoSync({ force: true });
      expect(manual).not.toBeNull();
      vi.setSystemTime(new Date(2026, 8, 22, 8, 0)); // manhã
      const auto = await runAutoSync();
      expect(auto).not.toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(2);
    });
  });

  it("runFullSync ignora cursores e baixa todas as tabelas", async () => {
    const results = await runFullSync();
    expect(results).not.toBeNull();
    expect(vi.mocked(syncTables).mock.calls[0]?.[0]).toMatchObject({ full: true });
  });
});
