// Anexa o token da conta às chamadas do servidor sem nunca prender o app.
//
// O anexador gerado chama getSession(), que tenta renovar a sessão pela rede
// quando o token venceu — sem internet isso ficava esperando. Aqui a espera
// tem limite e, se estourar, usamos o token guardado no aparelho.

import { createMiddleware } from "@tanstack/react-start";

const SESSION_WAIT_MS = 2500;

export function storedSessionKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const ref = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined)
    ?? (url ? new URL(url).hostname.split(".")[0] : undefined);
  return ref ? `sb-${ref}-auth-token` : null;
}

type StoredSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: { id?: string; email?: string } & Record<string, unknown>;
};

/** Sessão guardada no aparelho (sem rede). */
export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const key = storedSessionKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession | { currentSession?: StoredSession };
    const s = "currentSession" in parsed && parsed.currentSession ? parsed.currentSession : (parsed as StoredSession);
    return s?.access_token ? s : null;
  } catch {
    return null;
  }
}

export async function accessTokenFast(): Promise<string | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await Promise.race([
      supabase.auth.getSession().then((r) => r.data.session?.access_token ?? null),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), SESSION_WAIT_MS)),
    ]);
    if (result !== "timeout") return result ?? readStoredSession()?.access_token ?? null;
  } catch {
    /* segue para a cópia */
  }
  return readStoredSession()?.access_token ?? null;
}

export const attachAuthSafe = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = await accessTokenFast();
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
