import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetLocalDbForTests,
  clearDirty,
  clearLocalDb,
  getCursor,
  getDirtyRows,
  getRow,
  getRows,
  localDbStats,
  markDeleted,
  pruneLocalData,
  setCursor,
  upsertRows,
} from "./local-db";

type Row = Record<string, unknown>;

const row = (id: string, updated: string, extra: Row = {}): Row => ({
  id,
  updated_at: updated,
  ...extra,
});

describe("local-db (Fase 0 — espelho local)", () => {
  beforeEach(() => {
    __resetLocalDbForTests();
  });

  it("grava e lê linhas, avançando o cursor", async () => {
    await upsertRows("visits", [row("a", "2026-01-01T00:00:00Z"), row("b", "2026-01-02T00:00:00Z")]);
    expect((await getRows("visits")).length).toBe(2);
    expect(await getCursor("visits")).toBe("2026-01-02T00:00:00Z");
  });

  it("mantém a versão mais recente em conflito", async () => {
    await upsertRows("visits", [row("a", "2026-01-02T00:00:00Z", { title: "novo" })]);
    await upsertRows("visits", [row("a", "2026-01-01T00:00:00Z", { title: "velho" })]);
    expect(await getRow<Row>("visits", "a")).toMatchObject({ title: "novo" });
  });

  it("protege escrita local pendente contra carimbo igual ou menor", async () => {
    await upsertRows("visits", [row("a", "2026-01-02T00:00:00Z", { title: "local" })], {
      dirty: true,
    });
    await upsertRows("visits", [row("a", "2026-01-02T00:00:00Z", { title: "servidor" })]);
    expect(await getRow<Row>("visits", "a")).toMatchObject({ title: "local" });

    await upsertRows("visits", [row("a", "2026-01-03T00:00:00Z", { title: "servidor novo" })]);
    expect(await getRow<Row>("visits", "a")).toMatchObject({ title: "servidor novo" });
  });

  it("lista e limpa linhas sujas", async () => {
    await upsertRows("notes", [row("n1", "2026-01-01T00:00:00Z")], { dirty: true });
    expect((await getDirtyRows("notes")).length).toBe(1);
    await clearDirty("notes", ["n1"]);
    expect((await getDirtyRows("notes")).length).toBe(0);
    expect(await getRow("notes", "n1")).not.toBeNull();
  });

  it("esconde linhas excluídas em outro aparelho", async () => {
    await upsertRows("visits", [row("a", "2026-01-01T00:00:00Z")]);
    await markDeleted("visits", ["a"], "2026-01-05T00:00:00Z");
    expect(await getRow("visits", "a")).toBeNull();
    expect(await getRows("visits")).toEqual([]);
  });

  it("aplica filtro na leitura", async () => {
    await upsertRows("visits", [
      row("a", "2026-01-01T00:00:00Z", { cong: "x" }),
      row("b", "2026-01-01T00:00:00Z", { cong: "y" }),
    ]);
    const only = await getRows<Row>("visits", (r) => r.cong === "x");
    expect(only.map((r) => r.id)).toEqual(["a"]);
  });

  it("ignora linhas sem id e sobrevive a payload vazio", async () => {
    expect(await upsertRows("visits", [])).toBe(0);
    expect(await upsertRows("visits", [{ updated_at: "2026-01-01T00:00:00Z" }])).toBe(0);
  });

  it("reporta estatísticas e limpa tudo", async () => {
    await upsertRows("visits", [row("a", "2026-01-01T00:00:00Z")]);
    await setCursor("visits", "2026-01-09T00:00:00Z");
    const stats = await localDbStats();
    expect(stats.tables.find((t) => t.table === "visits")).toMatchObject({
      rows: 1,
      cursor: "2026-01-09T00:00:00Z",
    });
    await clearLocalDb();
    expect((await localDbStats()).tables).toEqual([]);
  });

  it("poda tombstones e linhas antigas, preservando pendências (dirty)", async () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const old = "2026-01-01T00:00:00Z"; // > 180 dias
    const fresh = "2026-09-20T12:00:00Z";

    await upsertRows("meals", [
      row("old-live", old),
      row("fresh-live", fresh),
    ]);
    await upsertRows("meals", [row("old-pending", old)], { dirty: true });
    await upsertRows("meals", [row("old-deleted", old)]);
    await markDeleted("meals", ["old-deleted"], old);

    const res = await pruneLocalData({ now });
    expect(res.removed).toBe(2); // old-live + old-deleted
    const ids = (await getRows("meals")).map((r) => r.id).sort();
    expect(ids).toEqual(["fresh-live", "old-pending"]);
  });

  it("não poda cursores internos (janelas de sincronização)", async () => {
    await setCursor("__auto_sync_window:morning", "2026-09-22");
    await pruneLocalData({ now: Date.parse("2026-09-22T12:00:00Z") });
    expect(await getCursor("__auto_sync_window:morning")).toBe("2026-09-22");
  });
});
