import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalFirstFetch } from "@/lib/local-first-fetch";
import { __resetStaleMarks, __useMemoryResponseCache, markTableStale } from "@/lib/response-cache";
import { __resetLocalDbForTests, upsertRows } from "@/lib/local-db";
import { withNetworkWindow } from "@/lib/net-policy";

const HOST = "proj.supabase.co";
// Junção: o espelho não responde, só a cópia exata (pior caso).
const URL_JOIN = `https://${HOST}/rest/v1/visits?select=*,congregations(name)`;
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });

async function seed() {
  const f = createLocalFirstFetch({ originalFetch: async () => json([{ id: "old" }]), supabaseHost: () => HOST, isOfflineMode: () => false });
  await withNetworkWindow(() => f(URL_JOIN));
}

describe("cópia vencida depois de salvar", () => {
  beforeEach(() => {
    __useMemoryResponseCache();
    __resetLocalDbForTests();
    __resetStaleMarks();
  });

  it("depois de salvar na tabela, a próxima leitura busca o dado novo", async () => {
    await seed();
    markTableStale("visits", Date.now() + 1);
    const net = vi.fn(async () => json([{ id: "new" }]));
    const f = createLocalFirstFetch({ originalFetch: net, supabaseHost: () => HOST, isOfflineMode: () => false });
    const body = await (await f(URL_JOIN)).json();
    expect(net).toHaveBeenCalledTimes(1);
    expect(body).toEqual([{ id: "new" }]);
  });

  it("sem internet, a cópia vencida continua aparecendo (nada é apagado)", async () => {
    await seed();
    markTableStale("visits", Date.now() + 1);
    const net = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    const f = createLocalFirstFetch({ originalFetch: net, supabaseHost: () => HOST, isOfflineMode: () => false });
    expect(await (await f(URL_JOIN)).json()).toEqual([{ id: "old" }]);
  });

  it("modo offline (PIN): usa a cópia vencida sem tocar na rede", async () => {
    await seed();
    markTableStale("visits", Date.now() + 1);
    const net = vi.fn(async () => json([]));
    const f = createLocalFirstFetch({ originalFetch: net, supabaseHost: () => HOST, isOfflineMode: () => true });
    expect(await (await f(URL_JOIN)).json()).toEqual([{ id: "old" }]);
    expect(net).not.toHaveBeenCalled();
  });

  it("tabela vencida com espelho no celular: responde do espelho, sem rede", async () => {
    await upsertRows("visits", [{ id: "m1", title: "atual" }]);
    const url = `https://${HOST}/rest/v1/visits?select=*`;
    const f0 = createLocalFirstFetch({ originalFetch: async () => json([{ id: "velho" }]), supabaseHost: () => HOST, isOfflineMode: () => false });
    await withNetworkWindow(() => f0(url));
    markTableStale("visits", Date.now() + 1);
    const net = vi.fn(async () => json([]));
    const f = createLocalFirstFetch({ originalFetch: net, supabaseHost: () => HOST, isOfflineMode: () => false });
    const body = await (await f(url)).json();
    expect(net).not.toHaveBeenCalled();
    expect(body.map((r: { id: string }) => r.id)).toEqual(["m1"]);
  });
});
