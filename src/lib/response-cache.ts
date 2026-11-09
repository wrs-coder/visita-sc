// Cópia no celular das respostas do servidor (leituras), por endereço.
//
// Guarda a resposta exata de cada leitura feita ao backend (tabelas e
// funções de leitura do servidor) para que a mesma tela abra depois sem
// internet. Armazenamento em IndexedDB, aberto sob demanda; se falhar, usa
// memória sem quebrar o app.

export type CachedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
};

export type CachedResponse = {
  key: string;
  kind: "rest" | "fn";
  /** Tabela do backend (só leituras de tabela). */
  table?: string | null;
  request: CachedRequest;
  status: number;
  headers: Record<string, string>;
  body: string;
  savedAt: number;
};

type Kv = {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse): Promise<void>;
  del(key: string): Promise<void>;
  entries(): Promise<CachedResponse[]>;
  clear(): Promise<void>;
};

const memory = new Map<string, CachedResponse>();
const memoryKv: Kv = {
  async get(k) { return memory.get(k); },
  async set(k, v) { memory.set(k, v); },
  async del(k) { memory.delete(k); },
  async entries() { return [...memory.values()]; },
  async clear() { memory.clear(); },
};

let kvPromise: Promise<Kv> | null = null;

function getKv(): Promise<Kv> {
  if (kvPromise) return kvPromise;
  kvPromise = (async (): Promise<Kv> => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") return memoryKv;
    try {
      const idb = await import("idb-keyval");
      const store = idb.createStore("visita-sc-responses", "kv");
      await idb.get("__probe__", store);
      return {
        get: (k) => idb.get(k, store) as Promise<CachedResponse | undefined>,
        set: (k, v) => idb.set(k, v, store),
        del: (k) => idb.del(k, store),
        entries: async () => (await idb.values(store)) as CachedResponse[],
        clear: () => idb.clear(store),
      };
    } catch (err) {
      console.warn("[response-cache] IndexedDB indisponível — usando memória", err);
      return memoryKv;
    }
  })();
  return kvPromise;
}

/** Apenas para testes. */
export function __useMemoryResponseCache() {
  kvPromise = Promise.resolve(memoryKv);
  memory.clear();
}

/** Cabeçalhos que nunca são guardados (credenciais). */
const SECRET_HEADERS = new Set(["authorization", "apikey", "cookie", "set-cookie", "x-client-info"]);

export function headersToRecord(h: HeadersInit | Headers | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  new Headers(h).forEach((value, key) => {
    if (!SECRET_HEADERS.has(key.toLowerCase())) out[key.toLowerCase()] = value;
  });
  return out;
}

export function restCacheKey(url: string, accept: string | null, prefer: string | null): string {
  return `rest:${url}|${accept ?? ""}|${prefer ?? ""}`;
}

export function fnCacheKey(fnId: string, payload: string): string {
  return `fn:${fnId}|${payload}`;
}

export async function getCached(key: string): Promise<CachedResponse | null> {
  try {
    return (await (await getKv()).get(key)) ?? null;
  } catch {
    return null;
  }
}

export async function putCached(entry: CachedResponse): Promise<void> {
  try {
    await (await getKv()).set(entry.key, entry);
  } catch (err) {
    console.warn("[response-cache] falha ao guardar", err);
  }
}

export async function listCached(): Promise<CachedResponse[]> {
  try {
    return await (await getKv()).entries();
  } catch {
    return [];
  }
}

export async function clearResponseCache(): Promise<void> {
  try {
    await (await getKv()).clear();
  } catch {
    /* noop */
  }
}

/** Monta uma resposta de verdade a partir da cópia guardada. */
export function toResponse(entry: CachedResponse): Response {
  const headers = new Headers(entry.headers);
  headers.set("x-visitasc-local", "cache");
  return new Response(entry.status === 204 ? null : entry.body, { status: entry.status, headers });
}

/** Guarda uma resposta bem-sucedida (lê uma cópia; a original segue intacta). */
export async function storeResponse(
  key: string,
  kind: CachedResponse["kind"],
  request: CachedRequest,
  res: Response,
  table: string | null = null,
): Promise<void> {
  if (!res.ok) return;
  try {
    const body = await res.clone().text();
    await putCached({
      key,
      kind,
      table,
      request,
      status: res.status,
      headers: headersToRecord(res.headers),
      body,
      savedAt: Date.now(),
    });
  } catch {
    /* corpo indisponível: segue sem guardar */
  }
}

// ---------------------------------------------------------------------------
// "Foto vencida": depois de uma gravação, as cópias antigas daquela tabela (e
// das funções de leitura) ficam marcadas como vencidas. Nada é apagado: sem
// internet a cópia vencida continua servindo; com internet, a tela tenta a
// cópia local atualizada (espelho) ou o servidor antes de usar a vencida.
// ---------------------------------------------------------------------------
const STALE_KEY = "visita-sc:stale-marks";
type StaleMarks = { fn: number; tables: Record<string, number> };
let staleMarks: StaleMarks | null = null;

function loadMarks(): StaleMarks {
  if (staleMarks) return staleMarks;
  staleMarks = { fn: 0, tables: {} };
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STALE_KEY) : null;
    if (raw) {
      const p = JSON.parse(raw) as Partial<StaleMarks>;
      staleMarks = { fn: typeof p.fn === "number" ? p.fn : 0, tables: p.tables && typeof p.tables === "object" ? p.tables : {} };
    }
  } catch { /* sem armazenamento */ }
  return staleMarks;
}

function saveMarks(): void {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(STALE_KEY, JSON.stringify(loadMarks())); } catch { /* quota */ }
}

/** Marca como vencidas as cópias de uma tabela guardadas até agora. */
export function markTableStale(table: string, now = Date.now()): void {
  loadMarks().tables[table] = now;
  saveMarks();
}

/** Marca como vencidas as cópias das funções de leitura guardadas até agora. */
export function markFnStale(now = Date.now()): void {
  loadMarks().fn = now;
  saveMarks();
}

/** A cópia foi guardada antes da última gravação relacionada? */
export function isStale(entry: CachedResponse): boolean {
  const m = loadMarks();
  const mark = entry.kind === "fn" ? m.fn : entry.table ? m.tables[entry.table] ?? 0 : 0;
  return entry.savedAt < mark;
}

/** Apenas para testes. */
export function __resetStaleMarks(): void {
  staleMarks = { fn: 0, tables: {} };
  saveMarks();
}
