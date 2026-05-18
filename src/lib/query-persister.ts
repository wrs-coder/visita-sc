// Persister para o TanStack Query usando IndexedDB (via idb-keyval) com
// fallback automático para localStorage caso o IndexedDB não esteja disponível
// (ex: modo privado em alguns navegadores).
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const PREFIX = "visita-sc:rq:";

function makeIdbStorage(): Storage {
  // Implementa apenas a tríade getItem/setItem/removeItem usada pelo persister.
  return {
    getItem: async (key: string) => {
      try {
        const v = await get(PREFIX + key);
        return (v as string) ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try { await set(PREFIX + key, value); } catch { /* quota */ }
    },
    removeItem: async (key: string) => {
      try { await del(PREFIX + key); } catch { /* ignore */ }
    },
    // métodos abaixo são exigidos pelo tipo Storage do TS, não são chamados
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

function pickStorage(): Storage {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0 } as Storage;
  }
  const w = window as Window & typeof globalThis;
  if ("indexedDB" in w) return makeIdbStorage();
  return w.localStorage;
}

export const queryPersister = createAsyncStoragePersister({
  storage: pickStorage(),
  key: "visita-sc-rq-cache",
  throttleTime: 1000,
});

// 24h
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;
// Bump para invalidar todo o cache em mudanças incompatíveis.
export const PERSIST_BUSTER = "v1";
