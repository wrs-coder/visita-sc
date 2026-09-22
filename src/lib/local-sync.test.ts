import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalDbForTests, getCursor, getRow, getRows } from "./local-db";
import {
  TOMBSTONE_CURSOR_TABLE,
  pullTable,
  pullTombstones,
  syncTables,
  type PullFn,
  type Row,
} from "./local-sync";

const r = (id: string, updated: string, extra: Row = {}): Row => ({
  id,
  updated_at: updated,
  ...extra,
});

describe("local-sync (Fase 1 — download incremental)", () => {
  beforeEach(() => {
    __resetLocalDbForTests();
  });

  it("baixa tudo na primeira vez e só o que mudou depois", async () => {
    const seen: Array<string | null> = [];
    const pull: PullFn = async ({ since }) => {
      seen.push(since);
      return since ? [r("b", "2026-02-02T00:00:00Z")] : [r("a", "2026-02-01T00:00:00Z")];
    };

    await pullTable("visits", pull);
    expect(await getCursor("visits")).toBe("2026-02-01T00:00:00Z");

    await pullTable("visits", pull);
    expect(seen).toEqual([null, "2026-02-01T00:00:00Z"]);
    expect((await getRows("visits")).length).toBe(2);
    expect(await getCursor("visits")).toBe("2026-02-02T00:00:00Z");
  });

  it("não avança o cursor nem quebra quando o servidor falha", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await pullTable("visits", async () => {
      throw new Error("offline");
    });
    expect(res.ok).toBe(false);
    expect(await getCursor("visits")).toBeNull();
    warn.mockRestore();
  });

  it("aplica exclusões feitas em outro aparelho", async () => {
    await pullTable("visits", async () => [r("a", "2026-02-01T00:00:00Z")]);
    const res = await pullTombstones(async () => [
      { table_name: "visits", row_id: "a", deleted_at: "2026-02-03T00:00:00Z" },
    ]);
    expect(res.ok).toBe(true);
    expect(await getRow("visits", "a")).toBeNull();
    expect(await getCursor(TOMBSTONE_CURSOR_TABLE)).toBe("2026-02-03T00:00:00Z");
  });

  it("sincroniza várias tabelas reportando progresso e isolando falhas", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const progress: string[] = [];
    const results = await syncTables({
      tables: ["visits", "meals"],
      pull: async ({ table }) => {
        if (table === "meals") throw new Error("boom");
        return [r("a", "2026-02-01T00:00:00Z")];
      },
      tombstones: async () => [],
      onProgress: (p) => progress.push(p.table),
    });
    expect(progress).toEqual(["visits", "meals", TOMBSTONE_CURSOR_TABLE]);
    expect(results.find((x) => x.table === "visits")?.ok).toBe(true);
    expect(results.find((x) => x.table === "meals")?.ok).toBe(false);
    expect((await getRows("visits")).length).toBe(1);
    warn.mockRestore();
  });

  it("respeita o cancelamento", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const results = await syncTables({
      tables: ["visits"],
      pull: async () => [r("a", "2026-02-01T00:00:00Z")],
      signal: ctrl.signal,
    });
    expect(results).toEqual([]);
  });
});
