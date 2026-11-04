// Camada "celular primeiro" para todas as chamadas ao backend.
//
// Leitura de tabela (GET/HEAD /rest/v1/<tabela>):
//   - normalmente: cópia exata guardada -> espelho do celular -> servidor
//     (só se o dado nunca foi baixado), sempre com limite de espera;
//   - na sincronização ou logo após salvar: servidor primeiro (com limite),
//     caindo para a cópia se falhar.
// Gravação (POST/PATCH/DELETE): servidor com limite de espera; quando dá
//   certo, atualiza o espelho e abre a janela curta de frescor.
// Login e demais chamadas: servidor com limite de espera.
// Modo offline (entrada por PIN sem servidor): nada vai à rede.

import {
  AUTH_TIMEOUT_MS,
  READ_TIMEOUT_MS,
  WRITE_TIMEOUT_MS,
  fetchWithTimeout,
  markWriteSucceeded,
  preferNetworkNow,
} from "@/lib/net-policy";
import {
  getCached,
  headersToRecord,
  restCacheKey,
  storeResponse,
  toResponse,
} from "@/lib/response-cache";
import { evaluatePostgrest, parseFilters, rowMatches, tableFromRestUrl, type Row } from "@/lib/postgrest-local";
import { isMirrorTable, mirrorIdField } from "@/lib/mirror-tables";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type LocalFirstDeps = {
  originalFetch: FetchLike;
  supabaseHost: () => string;
  isOfflineMode: () => boolean;
};

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function headerOf(input: RequestInfo | URL, init: RequestInit | undefined, name: string): string | null {
  const h = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((v, k) => h.set(k, v));
  return h.get(name);
}

async function answerFromMirror(url: string, method: string, accept: string | null, prefer: string | null) {
  const table = tableFromRestUrl(url);
  if (!table || !isMirrorTable(table)) return null;
  const { isTableMirrored, getRows } = await import("@/lib/local-db");
  if (!(await isTableMirrored(table))) return null;
  const rows = await getRows<Row>(table);
  const answer = evaluatePostgrest(url, rows, { method, accept, prefer });
  if (!answer) return null;
  const headers = new Headers(answer.headers);
  headers.set("x-visitasc-local", "mirror");
  return new Response(answer.body, { status: answer.status, headers });
}

async function localRead(url: string, method: string, accept: string | null, prefer: string | null) {
  const cached = await getCached(restCacheKey(url, accept, prefer));
  if (cached) return toResponse(cached);
  return answerFromMirror(url, method, accept, prefer);
}

function parseJsonRows(text: string): Row[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((r): r is Row => !!r && typeof r === "object");
    if (parsed && typeof parsed === "object") return [parsed as Row];
  } catch {
    /* sem corpo */
  }
  return [];
}

/** Depois de gravar no servidor, deixa o espelho do celular igual. */
async function mirrorWrite(
  url: string,
  method: string,
  requestBody: BodyInit | null | undefined,
  res: Response,
  refetch: (url: string) => Promise<Response>,
): Promise<void> {
  const table = tableFromRestUrl(url);
  if (!table || !isMirrorTable(table)) return;
  const { upsertRows, markDeleted, getRows } = await import("@/lib/local-db");
  const idField = mirrorIdField(table);
  const returned = parseJsonRows(await res.clone().text().catch(() => ""));
  if (method === "DELETE") {
    let ids = returned.map((r) => r[idField]).filter((v): v is string => typeof v === "string");
    if (!ids.length) {
      const filters = parseFilters(new URL(url).searchParams);
      if (filters && filters.length) {
        const rows = await getRows<Row>(table);
        ids = rows.filter((r) => rowMatches(r, filters)).map((r) => String(r[idField]));
      }
    }
    if (ids.length) await markDeleted(table, ids);
    return;
  }
  if (returned.length) {
    await upsertRows(table, returned, { idField });
    return;
  }
  // Sem retorno: busca as linhas afetadas (POST usa o corpo; PATCH, os filtros).
  let lookup: string | null = null;
  if (method === "PATCH") {
    const u = new URL(url);
    u.searchParams.set("select", "*");
    lookup = u.toString();
  } else if (method === "POST" && typeof requestBody === "string") {
    const ids = parseJsonRows(requestBody)
      .map((r) => r[idField])
      .filter((v): v is string => typeof v === "string");
    if (ids.length) {
      const u = new URL(url);
      [...u.searchParams.keys()].forEach((k) => u.searchParams.delete(k));
      u.searchParams.set("select", "*");
      u.searchParams.set(idField, `in.(${ids.map((i) => `"${i}"`).join(",")})`);
      lookup = u.toString();
    }
  }
  if (!lookup) return;
  const fresh = await refetch(lookup);
  if (!fresh.ok) return;
  const rows = parseJsonRows(await fresh.text());
  if (rows.length) await upsertRows(table, rows, { idField });
}

export function createLocalFirstFetch(deps: LocalFirstDeps): FetchLike {
  const { originalFetch } = deps;

  return async (input, init) => {
    const url = urlOf(input);
    const host = deps.supabaseHost();
    if (!host || !url.includes(host)) return originalFetch(input, init);

    const method = methodOf(input, init);
    const isRestTable = url.includes("/rest/v1/") && tableFromRestUrl(url) !== null;
    const isRead = method === "GET" || method === "HEAD";
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : null);
    const net = (ms: number) =>
      fetchWithTimeout((signal) => originalFetch(input, { ...init, signal }), ms, callerSignal);

    // Leitura de tabela: celular primeiro.
    if (isRestTable && isRead) {
      const accept = headerOf(input, init, "accept");
      const prefer = headerOf(input, init, "prefer");
      const key = restCacheKey(url, accept, prefer);
      const request = { url, method, headers: headersToRecord(new Headers(init?.headers)) };

      if (deps.isOfflineMode()) {
        const local = await localRead(url, method, accept, prefer);
        if (local) return local;
        throw new TypeError("Failed to fetch (offline mode)");
      }

      if (!preferNetworkNow()) {
        const local = await localRead(url, method, accept, prefer);
        if (local) return local;
      }
      try {
        const res = await net(READ_TIMEOUT_MS);
        if (res.ok && method === "GET") await storeResponse(key, "rest", request, res, tableFromRestUrl(url));
        if (res.status >= 500) {
          const local = await localRead(url, method, accept, prefer);
          if (local) return local;
        }
        return res;
      } catch (err) {
        const local = await localRead(url, method, accept, prefer);
        if (local) return local;
        throw err;
      }
    }

    if (deps.isOfflineMode()) throw new TypeError("Failed to fetch (offline mode)");

    // Gravação em tabela: servidor com limite; se der certo, espelha.
    if (isRestTable) {
      const res = await net(WRITE_TIMEOUT_MS);
      if (res.ok) {
        markWriteSucceeded();
        const body = init?.body ?? null;
        void mirrorWrite(url, method, body, res, (u) =>
          fetchWithTimeout(
            (signal) => originalFetch(u, { method: "GET", headers: init?.headers, signal }),
            READ_TIMEOUT_MS,
          ),
        ).catch(() => undefined);
      }
      return res;
    }

    if (url.includes("/auth/v1/")) return net(AUTH_TIMEOUT_MS);
    const res = await net(isRead ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS);
    if (res.ok && !isRead && url.includes("/rest/v1/rpc/")) markWriteSucceeded();
    return res;
  };
}
