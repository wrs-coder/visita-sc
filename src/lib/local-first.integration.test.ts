import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluatePostgrest } from "@/lib/postgrest-local";
import { createLocalFirstFetch } from "@/lib/local-first-fetch";
import { createLocalFirstFnFetch, READ_FN_HEADER } from "@/lib/local-first-fn";
import { __useMemoryResponseCache } from "@/lib/response-cache";
import { __resetLocalDbForTests, upsertRows } from "@/lib/local-db";
import { markWriteSucceeded, FRESH_AFTER_WRITE_MS, preferNetworkNow, withNetworkWindow } from "@/lib/net-policy";

const HOST = "proj.supabase.co";
const rows = [
  { id: "a", congregation_id: "c1", start_date: "2026-03-02", title: "X", archived: false },
  { id: "b", congregation_id: "c1", start_date: "2026-01-05", title: "Y", archived: true },
  { id: "c", congregation_id: "c2", start_date: "2026-02-01", title: null, archived: false },
];

describe("evaluatePostgrest (leitura no espelho do celular)", () => {
  it("filtra por eq, ordena e limita", () => {
    const r = evaluatePostgrest(
      `https://${HOST}/rest/v1/visits?select=*&congregation_id=eq.c1&order=start_date.asc&limit=1`,
      rows,
    )!;
    expect(JSON.parse(r.body!)).toEqual([rows[1]]);
  });
  it("entende in, is.null, not e colunas escolhidas", () => {
    const r = evaluatePostgrest(
      `https://${HOST}/rest/v1/visits?select=id,title&id=in.("a","c")&title=not.is.null`,
      rows,
    )!;
    expect(JSON.parse(r.body!)).toEqual([{ id: "a", title: "X" }]);
  });
  it("objeto único: 406 quando não há exatamente uma linha", () => {
    const one = evaluatePostgrest(`https://${HOST}/rest/v1/visits?id=eq.a`, rows, {
      accept: "application/vnd.pgrst.object+json",
    })!;
    expect(one.status).toBe(200);
    const none = evaluatePostgrest(`https://${HOST}/rest/v1/visits?id=eq.zz`, rows, {
      accept: "application/vnd.pgrst.object+json",
    })!;
    expect(none.status).toBe(406);
  });
  it("devolve contagem quando pedida", () => {
    const r = evaluatePostgrest(`https://${HOST}/rest/v1/visits?select=*&archived=eq.false`, rows, {
      prefer: "count=exact",
      method: "HEAD",
    })!;
    expect(r.headers["content-range"]).toBe("0-1/2");
    expect(r.body).toBeNull();
  });
  it("recusa junções e 'or' (não inventa resposta)", () => {
    expect(evaluatePostgrest(`https://${HOST}/rest/v1/visits?select=*,congregations(name)`, rows)).toBeNull();
    expect(evaluatePostgrest(`https://${HOST}/rest/v1/visits?or=(id.eq.a,id.eq.b)`, rows)).toBeNull();
  });
});

describe("leituras de tabela: celular primeiro", () => {
  beforeEach(() => {
    __useMemoryResponseCache();
    __resetLocalDbForTests();
  });

  it("com o dado no celular, a leitura NÃO vai ao servidor", async () => {
    await upsertRows("visits", rows);
    const net = vi.fn(async () => new Response("[]", { status: 200 }));
    const f = createLocalFirstFetch({ originalFetch: net, supabaseHost: () => HOST, isOfflineMode: () => false });
    const res = await f(`https://${HOST}/rest/v1/visits?select=*&congregation_id=eq.c2`);
    expect(net).not.toHaveBeenCalled();
    expect((await res.json()).map((r: { id: string }) => r.id)).toEqual(["c"]);
  });

  it("internet pendurada: desiste no limite e usa a cópia guardada", async () => {
    vi.useFakeTimers();
    try {
      const hang = vi.fn(() => new Promise<Response>(() => {}));
      const okNet = vi.fn(async () => new Response('[{"id":"z"}]', { status: 200 }));
      const url = `https://${HOST}/rest/v1/visits?select=*,congregations(name)`;
      // 1) leitura na sincronização guarda a cópia
      const f1 = createLocalFirstFetch({ originalFetch: okNet, supabaseHost: () => HOST, isOfflineMode: () => false });
      await withNetworkWindow(() => f1(url));
      // 2) na sincronização seguinte a rede trava: limite e cópia
      const f2 = createLocalFirstFetch({ originalFetch: hang, supabaseHost: () => HOST, isOfflineMode: () => false });
      const p = withNetworkWindow(() => f2(url));
      await vi.advanceTimersByTimeAsync(9000);
      const res = await p;
      expect(await res.json()).toEqual([{ id: "z" }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("depois de salvar, a leitura busca no servidor por um tempo curto", () => {
    const now = 1_000_000;
    markWriteSucceeded(now);
    expect(preferNetworkNow(now + 1000)).toBe(true);
    expect(preferNetworkNow(now + FRESH_AFTER_WRITE_MS + 1)).toBe(false);
  });
});

describe("funções de leitura do servidor: cópia no celular", () => {
  beforeEach(() => __useMemoryResponseCache());

  it("segunda abertura responde da cópia sem ir ao servidor", async () => {
    const net = vi.fn(async () => new Response('{"ok":1}', { status: 200 }));
    const f = createLocalFirstFnFetch(net, () => false);
    const init = { method: "POST", body: '{"a":1}', headers: { "x-tsr-serverfn": "true", [READ_FN_HEADER]: "1" } };
    await withNetworkWindow(() => f("https://visitasc.com.br/_serverFn/abc", init));
    expect(net).toHaveBeenCalledTimes(1);
    // outro domínio (app nativo troca de domínio): mesma cópia
    const res = await f("https://visita-sc.lovable.app/_serverFn/abc", init);
    expect(net).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it("funções de gravação nunca respondem da cópia", async () => {
    const net = vi.fn(async () => new Response('{"saved":1}', { status: 200 }));
    const f = createLocalFirstFnFetch(net, () => false);
    const init = { method: "POST", body: "{}", headers: { "x-tsr-serverfn": "true" } };
    await f("https://visitasc.com.br/_serverFn/save", init);
    await f("https://visitasc.com.br/_serverFn/save", init);
    expect(net).toHaveBeenCalledTimes(2);
  });
});
