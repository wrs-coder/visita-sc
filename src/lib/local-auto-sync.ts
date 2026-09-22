// FASE 4 — Sincronização automática do espelho local (2x ao dia).
//
// O download incremental (local-sync) roda automaticamente no máximo
// duas vezes por dia: uma na janela da manhã (06:00–11:59) e outra na
// janela da tarde (12:00–23:59), no horário do aparelho. Os gatilhos
// (abertura do app, retorno da conexão, retorno ao primeiro plano)
// continuam ativos, mas só executam de fato quando a janela atual ainda
// não sincronizou naquele dia. A sincronização manual (botão no Perfil)
// usa force:true e ignora as janelas. Nunca roda em paralelo, nunca roda
// sem internet e nunca lança erro para a interface.

import {
  syncTables,
  supabasePull,
  supabaseTombstones,
  type PullResult,
  type SyncProgress,
} from "@/lib/local-sync";
import { getCursor, pruneLocalData, setCursor } from "@/lib/local-db";

// Tabelas espelhadas: Fases 2/3 + Etapa A (esboços e reuniões ligadas a eles).
// Todas têm `updated_at` e gatilho de tombstone no banco (migração da Fase 1).
export const AUTO_SYNC_TABLES = [
  "congregations",
  "circuit_schedule_events",
  "field_assignments",
  "field_meetings",
  "checklist_items",
  "meals",
  "meal_day_notes",
  "transport_schedule",
  "private_notes",
  // Etapa A — esboços pessoais e dados de reuniões/discursos.
  "personal_outlines",
  "visits",
  "schedule_events",
  "midweek_meetings",
  "weekend_meetings",
  "pioneer_meetings",
  "elders_servants_meetings",
  "talk_themes",
] as const;

export type AutoSyncState = {
  running: boolean;
  lastRunAt: string | null;
  lastOk: boolean | null;
  lastRows: number;
  progress: SyncProgress | null;
  error: string | null;
};

let state: AutoSyncState = {
  running: false,
  lastRunAt: null,
  lastOk: null,
  lastRows: 0,
  progress: null,
  error: null,
};

const listeners = new Set<(s: AutoSyncState) => void>();
function emit() {
  for (const fn of listeners) fn({ ...state });
}
export function subscribeAutoSync(fn: (s: AutoSyncState) => void): () => void {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}
export function getAutoSyncState(): AutoSyncState {
  return { ...state };
}

const MIN_GAP_MS = 30 * 1000; // evita tempestade em eventos encadeados
let lastStart = 0;
let started = false;

// ————— Janelas diárias (horário do aparelho) —————
export type SyncWindow = "morning" | "afternoon";

export function currentSyncWindow(now: Date = new Date()): SyncWindow | null {
  const h = now.getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12) return "afternoon";
  return null; // 00:00–05:59: sem sincronização automática
}

function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const windowCursorKey = (w: SyncWindow) => `__auto_sync_window:${w}`;

/** A janela atual já sincronizou hoje? (null = fora de janela) */
async function windowAlreadySyncedToday(w: SyncWindow): Promise<boolean> {
  return (await getCursor(windowCursorKey(w))) === dayKey();
}

export async function runAutoSync(opts?: { force?: boolean; full?: boolean }): Promise<PullResult[] | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  if (state.running) return null;
  const now = Date.now();
  if (!opts?.force && now - lastStart < MIN_GAP_MS) return null;

  // Sem force: respeita a janela do dia (máx. 1 execução por janela).
  let windowToMark: SyncWindow | null = null;
  if (!opts?.force) {
    const w = currentSyncWindow();
    if (!w) return null;
    if (await windowAlreadySyncedToday(w)) return null;
    windowToMark = w;
  }
  lastStart = now;

  state = { ...state, running: true, error: null, progress: null };
  emit();
  try {
    if (windowToMark) {
      // Marca a janela como consumida hoje (best-effort; falha não impede a sync).
      await setCursor(windowCursorKey(windowToMark), dayKey()).catch(() => {});
    }
    const results = await syncTables({
      tables: [...AUTO_SYNC_TABLES],
      pull: supabasePull,
      tombstones: supabaseTombstones,
      full: opts?.full === true,
      onProgress: (p) => {
        state = { ...state, progress: p };
        emit();
      },
    });
    const failed = results.filter((r) => !r.ok);
    const rows = results.reduce((acc, r) => acc + r.rows, 0);
    state = {
      running: false,
      lastRunAt: new Date().toISOString(),
      lastOk: failed.length === 0,
      lastRows: rows,
      progress: null,
      error: failed.length ? failed.map((f) => f.table).join(", ") : null,
    };
    emit();
    if (failed.length === 0) {
      // Etapa C — limpeza silenciosa do espelho após sync bem-sucedida.
      // Nunca remove pendências (`dirty`); falhas são ignoradas.
      void pruneLocalData().catch(() => {});
    }
    return results;
  } catch (err) {
    state = {
      ...state,
      running: false,
      lastRunAt: new Date().toISOString(),
      lastOk: false,
      progress: null,
      error: err instanceof Error ? err.message : String(err),
    };
    emit();
    return null;
  }
}

/**
 * Etapa A — download completo (tela nova ou primeiro acesso no aparelho).
 * Ignora cursores e baixa todas as tabelas do zero, com barra de progresso.
 * Manual (botão "Baixar tudo agora" / pós-login): não consome a janela do dia.
 */
export function runFullSync(): Promise<PullResult[] | null> {
  return runAutoSync({ force: true, full: true });
}

/** Liga os gatilhos automáticos (limitados às janelas diárias). Idempotente. */
export function startAutoSync(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  void runAutoSync(); // abertura do app (só executa se a janela ainda não rodou hoje)
  const onOnline = () => void runAutoSync();
  const onVisible = () => {
    if (document.visibilityState === "visible") void runAutoSync();
  };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    started = false;
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function __resetAutoSyncForTests() {
  started = false;
  lastStart = 0;
  state = {
    running: false,
    lastRunAt: null,
    lastOk: null,
    lastRows: 0,
    progress: null,
    error: null,
  };
  listeners.clear();
}
