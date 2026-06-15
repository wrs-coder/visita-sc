// Onda 7.4 — Warm-up automático: ao logar, pré-carrega tudo (queries +
// shells de rotas) em background no idle, sem bloquear a UI. Idempotente
// por sessão de usuário (uma vez por user.id por aba).
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import {
  prefetchAllForOffline,
  LAST_WARMUP_KEY,
  type ProgressEvent,
} from "@/lib/offline-prefetch";
import { prefetchRouteShells } from "@/lib/offline-shells";
import { isOfflineMode } from "@/lib/connection-mode";
import { localDayKey } from "@/lib/local-day";

const WARMUP_SESSION_KEY = "visita-sc:warmup-session";
const WARMUP_TTL_MS = 6 * 60 * 60 * 1000; // 6h: re-warm em sessões longas
// Falha observada após a Onda 7.4: o warm-up automático competia com a
// restauração da sessão e podia mostrar a nuvem/porcentagem em toda abertura.
// Mantemos a cobertura offline disponível apenas por ações explícitas
// (Sincronizar, Modo Offline, comando manual), nunca no boot do aplicativo.
const AUTO_WARMUP_ON_BOOT = false;
// Missão 02 (download persistente): se o último warm-up foi feito HOJE
// (data local do dispositivo) e a congregação ativa não mudou, pulamos
// completamente o download automático. O usuário ainda pode forçar via
// botão "Sincronizar" ou ao ativar o Modo Offline.

/**
 * Exportado para reuso pelo Modo Offline / Toggle de conexão:
 * pula o `prefetchAllForOffline` quando a pré-carga do dia já existe
 * para a congregação ativa.
 */
export function isOfflinePrefetchFreshToday(userId?: string | null): boolean {
  try {
    const raw = localStorage.getItem(LAST_WARMUP_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw) as { at?: number; userId?: string | null };
    if (userId && s.userId && s.userId !== userId) return false;
    if (!s.at) return false;
    return localDayKey(s.at) === localDayKey(Date.now());
  } catch {
    return false;
  }
}


type WarmupState = {
  running: boolean;
  progress: ProgressEvent | null;
  shells: { step: number; total: number; route: string } | null;
  done: boolean;
};

const listeners = new Set<(s: WarmupState) => void>();
let state: WarmupState = { running: false, progress: null, shells: null, done: false };

function emit() {
  for (const l of listeners) l(state);
}

export function subscribeWarmup(fn: (s: WarmupState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => { listeners.delete(fn); };
}

function alreadyWarmed(userId: string): boolean {
  try {
    const raw = sessionStorage.getItem(WARMUP_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { userId: string; ts: number };
    return parsed.userId === userId && Date.now() - parsed.ts < WARMUP_TTL_MS;
  } catch {
    return false;
  }
}

function markWarmed(userId: string) {
  try {
    sessionStorage.setItem(WARMUP_SESSION_KEY, JSON.stringify({ userId, ts: Date.now() }));
  } catch {
    /* quota */
  }
}

/**
 * Dispara o warm-up offline silencioso após o login.
 * - Roda no `requestIdleCallback` para não competir com a primeira renderização.
 * - Não roda se já estiver em Modo Offline (UI desse modo controla o próprio fluxo).
 * - Idempotente: 1 vez por user.id a cada 6h por aba.
 */
export function useOfflineWarmup() {
  const { user, role, loading } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    if (!AUTO_WARMUP_ON_BOOT) {
      state = { running: false, progress: null, shells: null, done: false };
      emit();
      return;
    }
    if (loading || !user?.id) return;
    if (isOfflineMode()) return;
    if (alreadyWarmed(user.id)) {
      // Já tratado nesta aba: não mostra badge nem reemite “Pronto para offline”.
      state = { running: false, progress: null, shells: null, done: false };
      emit();
      return;
    }

    if (isOfflinePrefetchFreshToday(user.id)) {
      // Última pré-carga feita hoje para este usuário: nada para baixar.
      markWarmed(user.id);
      // Mantém a UI silenciosa em aberturas subsequentes do aplicativo.
      state = { running: false, progress: null, shells: null, done: false };
      emit();
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      state = { running: true, progress: null, shells: null, done: false };
      emit();
      try {
        // 1) Pré-carga de dados do Supabase no React Query cache.
        await prefetchAllForOffline({
          queryClient,
          userId: user.id,
          congregationId: null,
          role,
          signal: controller.signal,
          onProgress: (p) => {
            if (cancelled) return;
            state = { ...state, progress: p };
            emit();
          },
          t,
        });
        // 2) Pré-carga das "shells" HTML/JS/CSS de cada rota.
        await prefetchRouteShells({
          signal: controller.signal,
          onProgress: (p) => {
            if (cancelled) return;
            state = { ...state, shells: p };
            emit();
          },
        });
        if (!cancelled) {
          markWarmed(user.id);
          state = { running: false, progress: state.progress, shells: state.shells, done: true };
          emit();
        }
      } catch (err) {
        console.warn("[offline-warmup] falha silenciosa", err);
        if (!cancelled) {
          state = { ...state, running: false };
          emit();
        }
      }
    };

    // Agenda no idle para não competir com a primeira pintura.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => { void run(); }, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(() => { void run(); }, 1200);
    }
    return () => {
      cancelled = true;
      controller.abort();
      if (idleId !== null && typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [user?.id, role, loading, queryClient, t]);
}
