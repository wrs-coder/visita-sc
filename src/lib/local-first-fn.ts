// Funções de leitura do servidor (listas, resumos, modelos) com cópia no
// celular. A função marcada com `readCacheMiddleware` passa a responder da
// cópia guardada; o servidor só é usado na sincronização, logo após salvar,
// ou quando a cópia ainda não existe. Funções de gravação nunca usam cópia:
// só ganham limite de espera e abrem a janela curta de frescor ao dar certo.

import { createMiddleware } from "@tanstack/react-start";
import {
  fetchWithTimeout,
  markWriteSucceeded,
  preferNetworkNow,
} from "@/lib/net-policy";
import { fnCacheKey, getCached, headersToRecord, storeResponse, toResponse } from "@/lib/response-cache";

export const READ_FN_HEADER = "x-visitasc-read";
const FN_READ_TIMEOUT_MS = 15_000;
const NON_READ_TIMEOUT_MS = 45_000;

/** Marca a função do servidor como "só leitura" (pode responder da cópia). */
export const readCacheMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) =>
  next({ headers: { [READ_FN_HEADER]: "1" } }),
);

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function mergedHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const h = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((v, k) => h.set(k, v));
  return h;
}

/** Caminho do endereço sem o domínio (o app nativo troca de domínio). */
function pathOf(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/i, "");
}

export function fnRequestKey(url: string, body: string | null): string {
  return fnCacheKey(pathOf(url), body ?? "");
}

/**
 * Envolve o transporte das funções do servidor. `network` é o transporte
 * real (nativo ou navegador); aqui só decidimos cópia x servidor e o limite.
 */
export function createLocalFirstFnFetch(network: FetchLike, isOfflineMode: () => boolean): FetchLike {
  return async (input, init) => {
    const headers = mergedHeaders(input, init);
    const isServerFn = headers.get("x-tsr-serverfn") === "true";
    const isReadFn = headers.get(READ_FN_HEADER) === "1";
    if (isReadFn) headers.delete(READ_FN_HEADER);
    const nextInit: RequestInit = { ...init, headers };
    const callerSignal = init?.signal ?? null;
    // Gravações e login mantêm as tentativas por domínio do app nativo; o
    // limite aqui só impede espera infinita.
    const run = (ms: number) =>
      fetchWithTimeout((signal) => network(input, { ...nextInit, signal }), ms, callerSignal);

    if (!isServerFn) return run(NON_READ_TIMEOUT_MS);

    if (!isReadFn) {
      if (isOfflineMode()) throw new TypeError("Failed to fetch (offline mode)");
      const res = await run(NON_READ_TIMEOUT_MS);
      if (res.ok) markWriteSucceeded();
      return res;
    }

    const url = urlOf(input);
    const body = typeof init?.body === "string" ? init.body : null;
    const key = fnRequestKey(url, body);
    const local = async () => {
      const cached = await getCached(key);
      return cached ? toResponse(cached) : null;
    };

    if (isOfflineMode() || !preferNetworkNow()) {
      const hit = await local();
      if (hit) return hit;
      if (isOfflineMode()) throw new TypeError("Failed to fetch (offline mode)");
    }
    try {
      const res = await run(FN_READ_TIMEOUT_MS);
      if (res.ok) {
        await storeResponse(
          key,
          "fn",
          { url: pathOf(url), method: (init?.method ?? "POST").toUpperCase(), headers: headersToRecord(headers), body },
          res,
        );
        return res;
      }
      if (res.status >= 500) {
        const hit = await local();
        if (hit) return hit;
      }
      return res;
    } catch (err) {
      const hit = await local();
      if (hit) return hit;
      throw err;
    }
  };
}
