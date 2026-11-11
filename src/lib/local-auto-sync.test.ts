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

  describe("janela diária (1x ao dia, madrugada)", () => {
    beforeEach(() => { const m = new Map<string, string>([["visita-sc:auto-sync-jitter", "0"]]); vi.stubGlobal("localStorage", { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }); });

    it("só libera a partir das 02:00 (+ sorteio do aparelho)", () => {
      const at = (h: number, m = 0) => new Date(2026, 8, 22, h, m);
      expect(currentSyncWindow(at(0))).toBeNull();
      expect(currentSyncWindow(at(1, 59))).toBeNull();
      expect(currentSyncWindow(at(2))).toBe("daily");
      expect(currentSyncWindow(at(2, 10), 15)).toBeNull();
      expect(currentSyncWindow(at(2, 15), 15)).toBe("daily");
      expect(currentSyncWindow(at(23, 59))).toBe("daily");
    });

    it("roda uma única vez por dia", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 3, 0));
      expect(await runAutoSync()).not.toBeNull();
      vi.setSystemTime(new Date(2026, 8, 22, 15, 0));
      expect(await runAutoSync()).toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(1);
    });

    it("app fechado de madrugada: roda na primeira abertura do dia", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 9, 0));
      expect(await runAutoSync()).not.toBeNull();
    });

    it("não roda antes das 02:00", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 1, 0));
      expect(await runAutoSync()).toBeNull();
      expect(syncTables).not.toHaveBeenCalled();
    });

    it("virada de dia libera de novo; manual não consome o dia", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 22, 1, 0));
      expect(await runAutoSync({ force: true })).not.toBeNull();
      vi.setSystemTime(new Date(2026, 8, 22, 8, 0));
      expect(await runAutoSync()).not.toBeNull();
      vi.setSystemTime(new Date(2026, 8, 23, 8, 0));
      expect(await runAutoSync()).not.toBeNull();
      expect(syncTables).toHaveBeenCalledTimes(3);
    });
  });

  it("runFullSync ignora cursores e baixa todas as tabelas", async () => {
    const results = await runFullSync();
    expect(results).not.toBeNull();
    expect(vi.mocked(syncTables).mock.calls[0]?.[0]).toMatchObject({ full: true });
  });
});
