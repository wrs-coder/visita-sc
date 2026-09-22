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
import {
  __resetAutoSyncForTests,
  getAutoSyncState,
  runAutoSync,
  subscribeAutoSync,
} from "@/lib/local-auto-sync";

describe("local-auto-sync (Fase 4)", () => {
  beforeEach(() => {
    __resetAutoSyncForTests();
    vi.clearAllMocks();
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
});
