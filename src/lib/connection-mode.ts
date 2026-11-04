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
import { createLocalFirstFetch } from "@/lib/local-first-fetch";

export type ConnectionMode = "online" | "offline";

const KEY = "visita-sc:connection-mode";
const listeners = new Set<(m: ConnectionMode) => void>();

let current: ConnectionMode = (() => {
  if (typeof window === "undefined") return "online";
  try {
    const v = localStorage.getItem(KEY);
    // O interruptor "Modo offline" saiu do app: o modo só continua ligado
    // quando a entrada foi feita por PIN sem servidor (sessão local).
    if (v === "offline" && !localStorage.getItem("visita-sc:offline-session")) {
      localStorage.setItem(KEY, "online");
      return "online";
    }
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
let installed = false;

// Celular primeiro: leituras vêm da cópia do aparelho; o servidor só é usado
// na sincronização, logo após salvar, ou quando o dado nunca foi baixado.
// Toda chamada tem limite de espera (ver local-first-fetch.ts).
function applyFetchInterceptor() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  if (!originalFetch) originalFetch = window.fetch.bind(window);
  const base = originalFetch;
  window.fetch = createLocalFirstFetch({
    originalFetch: base,
    supabaseHost: getSupabaseHost,
    isOfflineMode: () => current === "offline",
  }) as typeof fetch;
}

/** Fetch original do navegador (sem a camada celular-primeiro). */
export function rawFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return (originalFetch ?? window.fetch.bind(window))(input, init);
}

function applySupabaseAutoRefresh() {
  try {
    // Pausa em duas situações:
    //   1. Modo offline manual — sem rede, refresh só gera SIGNED_OUT espúrio.
    //   2. Aba em background (document.hidden) — no Android WebView, refresh
    //      em segundo plano falha frequentemente e drena tokens. Retoma no
    //      `visibilitychange → visible` via `session-ready`.
    const hidden =
      typeof document !== "undefined" && document.visibilityState === "hidden";
    if (current === "offline" || hidden) {
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
  // Reaplica quando a visibilidade muda — o gate acima decide se retoma.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", applySupabaseAutoRefresh);
  }
}
