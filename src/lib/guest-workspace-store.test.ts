import { describe, it, expect, vi, beforeEach } from "vitest";

const mem = new Map<string, unknown>();
const ls = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => ls.get(k) ?? null,
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
  clear: () => ls.clear(),
};
vi.mock("idb-keyval", () => ({
  get: async (k: string) => mem.get(k),
  set: async (k: string, v: unknown) => { mem.set(k, v); },
}));

import { sanitizeWs, loadWs, saveWs, wsSessionKey, emptyWs } from "./guest-workspace-store";

const note = (id: string) => ({ id, kind: "note" as const, title: id, body: "b", folderId: null, color: null, updatedAt: "2026-01-01" });

describe("guest workspace", () => {
  beforeEach(() => { mem.clear(); localStorage.clear(); });

  it("descarta itens de tipo desconhecido ao restaurar", () => {
    const d = sanitizeWs({ items: [{ id: "a", kind: "note", title: "x", body: "y" }, { id: "b", kind: "hack" }] });
    expect(d.items.map((i) => i.id)).toEqual(["a"]);
  });
  it("arquivo inválido vira espaço vazio", () => {
    expect(sanitizeWs("lixo").items).toHaveLength(0);
  });
  it("dados continuam após recarregar", async () => {
    const sk = wsSessionKey("ABC");
    await saveWs(sk, { ...emptyWs(), items: [note("a")], folders: [{ id: "f", name: "P" }] });
    const d = await loadWs(sk);
    expect(d.items.map((i) => i.id)).toEqual(["a"]);
    expect(d.folders).toHaveLength(1);
  });
  it("um código não vê os dados de outro", async () => {
    await saveWs(wsSessionKey("ABC"), { ...emptyWs(), items: [note("a")] });
    expect((await loadWs(wsSessionKey("XYZ"))).items).toHaveLength(0);
  });
  it("migra a chave antiga do localStorage", async () => {
    localStorage.setItem("guest.workspace.data", JSON.stringify({ items: [note("old")] }));
    const sk = wsSessionKey("ABC");
    expect((await loadWs(sk)).items[0].id).toBe("old");
    expect(localStorage.getItem("guest.workspace.data")).toBeNull();
    expect((await loadWs(sk)).items[0].id).toBe("old");
  });
  it("item apagado continua apagado após recarregar", async () => {
    const sk = wsSessionKey("ABC");
    await saveWs(sk, { ...emptyWs(), items: [note("a"), note("b")] });
    const d = await loadWs(sk);
    await saveWs(sk, { ...d, items: d.items.filter((i) => i.id !== "a") });
    expect((await loadWs(sk)).items.map((i) => i.id)).toEqual(["b"]);
  });
});
