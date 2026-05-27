// Estado global do "modo de conexão" escolhido pelo usuário.
//
// - "online"  → leituras vêm do cache local; escritas vão ao Supabase quando
//               a rede responde; sincronização explícita via botão.
// - "offline" → nenhuma chamada de rede ao Supabase é executada. Reads usam
//               o cache do TanStack Query (persistido em IndexedDB) e snapshots
//               em localStorage. Writes são enfileiradas em `offline-queue`.
//               O auto-refresh de sessão do Supabase é ignorado, então o
//               usuário NÃO é deslogado por token expirado.
//
// Persistência: localStorage, default "online". 100% client-side.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionMode = "online" | "offline";

const KEY = "visita-sc:connection-mode";
const listeners = new Set<(m: ConnectionMode) => void>();

let current: ConnectionMode = (() => {
  if (typeof window === "undefined") return "online";
  try {
    const v = localStorage.getItem(KEY);
    return v === "offline" ? "offline" : "online";
  } catch {
    return "online";
  }
})();

export function getMode(): ConnectionMode {
  return current;
}

export function isOfflineMode(): boolean {
  return current === "offline";
}

export function setMode(m: ConnectionMode): void {
  if (current === m) return;
  current = m;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* quota */
    }
  }
  applyFetchInterceptor();
  applySupabaseAutoRefresh();
  listeners.forEach((cb) => {
    try {
      cb(m);
    } catch {
      /* noop */
    }
  });
}

export function subscribe(cb: (m: ConnectionMode) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useConnectionMode(): ConnectionMode {
  const [m, setM] = useState<ConnectionMode>(current);
  useEffect(() => subscribe(setM), []);
  return m;
}

// ---------------------------------------------------------------------------
// Interceptor de fetch — bloqueia chamadas ao Supabase em Modo Offline.
// Devolve um erro de rede sintético, exatamente o que `offline-supabase.ts`,
// `snapshot-cache` e demais caminhos já sabem tratar (caem no cache local).
// ---------------------------------------------------------------------------

let supabaseHost: string | null = null;
function getSupabaseHost(): string {
  if (supabaseHost) return supabaseHost;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (url) supabaseHost = new URL(url).host;
  } catch {
    /* ignore */
  }
  return supabaseHost ?? "";
}

let originalFetch: typeof fetch | null = null;
function applyFetchInterceptor() {
  if (typeof window === "undefined") return;
  if (!originalFetch) originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (current === "offline") {
      let url = "";
      try {
        url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
      } catch {
        /* deixa passar */
      }
      const host = getSupabaseHost();
      const isSupabase = !!host && url.includes(host);
      if (isSupabase) {
        // Em Modo Offline, NÃO derrubamos a chamada imediatamente: primeiro
        // tentamos servir do Cache Storage (gravado pelo Service Worker em
        // navegações anteriores) — é exatamente isso que mantém as telas
        // populadas sem internet. Só quando não há nada em cache devolvemos
        // um erro de rede sintético para que os fallbacks (snapshot-cache,
        // React Query persistido) entrem em ação.
        try {
          if (typeof caches !== "undefined") {
            const req = new Request(url, {
              method: (init?.method ?? "GET").toUpperCase(),
            });
            if (req.method === "GET") {
              const hit = await caches.match(req, { ignoreVary: true, ignoreSearch: false });
              if (hit) return hit;
            }
          }
        } catch {
          /* segue para o erro abaixo */
        }
        throw new TypeError("Failed to fetch (offline mode)");
      }
    }
    return originalFetch!(input as RequestInfo, init);
  };
}

function applySupabaseAutoRefresh() {
  try {
    if (current === "offline") {
      // Para o auto-refresh do JWT — sem isso, em modo offline o cliente
      // tentaria renovar o token, falharia e dispararia SIGNED_OUT.
      supabase.auth.stopAutoRefresh?.();
    } else {
      supabase.auth.startAutoRefresh?.();
    }
  } catch {
    /* SDK sem suporte */
  }
}

// Aplica o estado inicial assim que o módulo carrega no browser.
if (typeof window !== "undefined") {
  applyFetchInterceptor();
  applySupabaseAutoRefresh();
}
