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
import { getCursor, setCursor } from "@/lib/local-db";

// Mesmas tabelas já espelhadas pelas telas (Fases 2 e 3).
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

const INTERVAL_MS = 5 * 60 * 1000; // 5 min
const MIN_GAP_MS = 30 * 1000; // evita tempestade em eventos encadeados
let lastStart = 0;
let started = false;

export async function runAutoSync(opts?: { force?: boolean }): Promise<PullResult[] | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  if (state.running) return null;
  const now = Date.now();
  if (!opts?.force && now - lastStart < MIN_GAP_MS) return null;
  lastStart = now;

  state = { ...state, running: true, error: null, progress: null };
  emit();
  try {
    const results = await syncTables({
      tables: [...AUTO_SYNC_TABLES],
      pull: supabasePull,
      tombstones: supabaseTombstones,
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

/** Liga os gatilhos automáticos. Retorna função de limpeza. Idempotente. */
export function startAutoSync(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  void runAutoSync(); // abertura do app
  const onOnline = () => void runAutoSync();
  const onVisible = () => {
    if (document.visibilityState === "visible") void runAutoSync();
  };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  const timer = setInterval(() => void runAutoSync(), INTERVAL_MS);

  return () => {
    started = false;
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    clearInterval(timer);
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
