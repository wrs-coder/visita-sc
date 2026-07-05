// Session-ready gate — garante que a sessão do Supabase esteja renovada
// antes de disparar operações de rede sensíveis (flush da fila offline,
// invalidações em massa) após o app voltar do background.
//
// Motivo: no Android WebView, quando o app fica em segundo plano por mais
// de 1h, o access_token expira. Ao voltar (`pageshow`/`visibilitychange`),
// o auto-refresh do supabase-js roda de forma assíncrona — se dispararmos
// o flush imediatamente, várias mutations retornam 401 e são perdidas.
//
// Esta função é idempotente e barata quando o token já está válido.

import { supabase } from "@/integrations/supabase/client";

// Renova quando falta menos que este limiar para o token expirar.
const REFRESH_SAFETY_WINDOW_S = 60;

let inflight: Promise<{ ok: boolean; reason?: "no-session" | "refresh-failed" | "offline" }> | null =
  null;

export type SessionReadyResult = {
  ok: boolean;
  reason?: "no-session" | "refresh-failed" | "offline";
};

export async function ensureFreshSession(): Promise<SessionReadyResult> {
  // Sem rede: nada a fazer aqui — o flush respeita `navigator.onLine`.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline" };
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { ok: false, reason: "no-session" as const };

      const nowS = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at ?? 0;
      const secondsLeft = expiresAt - nowS;

      if (secondsLeft > REFRESH_SAFETY_WINDOW_S) {
        return { ok: true };
      }

      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        return { ok: false, reason: "refresh-failed" as const };
      }
      return { ok: true };
    } catch (err) {
      console.warn("[session-ready] falha ao validar sessão", err);
      return { ok: false, reason: "refresh-failed" as const };
    } finally {
      // Libera após o microtask corrente para permitir coalescing sem loop.
      queueMicrotask(() => {
        inflight = null;
      });
    }
  })();

  return inflight;
}
