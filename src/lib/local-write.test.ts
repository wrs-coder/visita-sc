import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalDbForTests, getRow, getRows, upsertRows } from "@/lib/local-db";

const offline = {
  offlineInsert: vi.fn(async () => ({ error: null, queued: true })),
  offlineUpsert: vi.fn(async () => ({ error: null, queued: true })),
  offlineUpdate: vi.fn(async () => ({ error: null, queued: true })),
  offlineDelete: vi.fn(async () => ({ error: null, queued: true })),
};

vi.mock("@/lib/offline-supabase", () => offline);
vi.mock("@/lib/offline-queue", () => ({
  queueSize: () => 0,
  subscribe: () => () => undefined,
}));

import {
  __resetLocalWriteForTests,
  localDelete,
  localInsert,
  localUpdate,
  reconcileDirty,
} from "@/lib/local-write";

type Meal = { id: string; host_name?: string; updated_at?: string };

async function flushMirror() {
  await new Promise((r) => setTimeout(r, 10));
}

describe("local-write (Fase 3)", () => {
  beforeEach(() => {
    __resetLocalDbForTests();
    __resetLocalWriteForTests();
    vi.clearAllMocks();
  });

  it("espelha o insert localmente", async () => {
    const res = await localInsert("meals", { id: "a", host_name: "Ana" });
    expect(res.error).toBeNull();
    await flushMirror();
    expect(await getRow<Meal>("meals", "a")).toMatchObject({ host_name: "Ana" });
  });

  it("aplica o patch sobre a linha já espelhada", async () => {
    await upsertRows("meals", [{ id: "a", host_name: "Ana", updated_at: "2026-01-01T00:00:00Z" }]);
    await localUpdate("meals", { host_name: "Bia" }, { id: "a" });
    await flushMirror();
    expect(await getRow<Meal>("meals", "a")).toMatchObject({ id: "a", host_name: "Bia" });
  });

  it("remove a linha do espelho no delete", async () => {
    await upsertRows("meals", [{ id: "a", updated_at: "2026-01-01T00:00:00Z" }]);
    await localDelete("meals", { id: "a" });
    await flushMirror();
    expect(await getRows("meals")).toHaveLength(0);
  });

  it("preserva a edição local pendente contra carimbo antigo do servidor", async () => {
    await upsertRows("meals", [{ id: "a", host_name: "Ana", updated_at: "2026-01-01T00:00:00Z" }]);
    await localUpdate("meals", { host_name: "Bia" }, { id: "a" });
    await flushMirror();
    await upsertRows("meals", [{ id: "a", host_name: "Ana", updated_at: "2026-01-01T00:00:00Z" }]);
    expect(await getRow<Meal>("meals", "a")).toMatchObject({ host_name: "Bia" });
  });

  it("deixa o servidor vencer quando tem versão mais nova", async () => {
    await localUpdate("meals", { host_name: "Bia" }, { id: "a" });
    await flushMirror();
    await upsertRows("meals", [{ id: "a", host_name: "Servidor", updated_at: "2999-01-01T00:00:00Z" }]);
    expect(await getRow<Meal>("meals", "a")).toMatchObject({ host_name: "Servidor" });
  });

  it("reconcilia (limpa pendências) sem apagar dados", async () => {
    await localUpdate("meals", { host_name: "Bia" }, { id: "a" });
    await flushMirror();
    await reconcileDirty();
    expect(await getRow<Meal>("meals", "a")).toMatchObject({ host_name: "Bia" });
  });
});
