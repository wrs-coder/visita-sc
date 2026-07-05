// Fila offline de escritas para o Supabase.
// As mutações são salvas em localStorage e enviadas em lote quando o
// dispositivo voltar a ficar online, ou quando o usuário tocar em "Sincronizar".
//
// Onda 4 — retry exponencial com jitter:
// Cada item carrega `attempts` (n. de tentativas falhas) e `nextAttemptAt`
// (timestamp em ms). No flush, itens que ainda não atingiram `nextAttemptAt`
// são preservados sem ser enviados, evitando martelar o servidor após
// falhas seguidas. Backoff: 5s, 15s, 1min, 5min, 15min (teto) + jitter aleatório
// de 0-500ms para evitar thundering herd.
//
// Refinamento premium (offline-first):
// - Coalescing de UPDATEs: N updates do mesmo (table, id) viram 1 UPDATE
//   com merge dos patches ao enfileirar.
// - Dedupe por chave idempotente (`dedupeKey`) para inserts placeholder.
// - Session-ready gate antes de cada flush (evita 401 pós-background).
// - Wake lock temporizado durante flushes grandes.

import { supabase } from "@/integrations/supabase/client";
import { ensureFreshSession } from "@/lib/session-ready";
import { acquireScreenWakeLockTimed } from "@/lib/wake-lock";

const STORAGE_KEY = "visita-sc:offline-queue";

export type QueuedMutation = {
  id: string;
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  /** Chave idempotente opcional para dedupe de inserts placeholder. */
  dedupeKey?: string;
  createdAt: string;
  attempts?: number;
  nextAttemptAt?: number;
  lastError?: string;
};

type Listener = (size: number) => void;
const listeners = new Set<Listener>();

type FlushProgressListener = (info: { total: number; done: number }) => void;
const progressListeners = new Set<FlushProgressListener>();

// Backoff exponencial em ms. Após o último, repete o teto.
const BACKOFF_STEPS_MS = [5_000, 15_000, 60_000, 5 * 60_000, 15 * 60_000];
const JITTER_MAX_MS = 500;
const WAKE_LOCK_THRESHOLD_ITEMS = 5;

function backoffFor(attempts: number): number {
  const idx = Math.min(attempts - 1, BACKOFF_STEPS_MS.length - 1);
  const base = BACKOFF_STEPS_MS[Math.max(0, idx)];
  return base + Math.floor(Math.random() * JITTER_MAX_MS);
}

function read(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedMutation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l(queue.length));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function queueSize(): number {
  return read().length;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(queueSize());
  return () => { listeners.delete(fn); };
}

export function subscribeFlushProgress(fn: FlushProgressListener): () => void {
  progressListeners.add(fn);
  return () => { progressListeners.delete(fn); };
}

function emitProgress(info: { total: number; done: number }) {
  progressListeners.forEach((l) => {
    try { l(info); } catch { /* noop */ }
  });
}

/**
 * Extrai a chave lógica (id) do match/payload de uma mutação update.
 * Usada para coalescing de UPDATEs sobre a mesma linha.
 */
function updateKey(m: Pick<QueuedMutation, "table" | "op" | "match">): string | null {
  if (m.op !== "update" || !m.match) return null;
  const id = m.match.id;
  if (typeof id !== "string" && typeof id !== "number") return null;
  return `${m.table}::${String(id)}`;
}

/**
 * Enfileira uma mutação com dois refinamentos:
 * - Coalescing de UPDATEs: se já existe um update pendente para o mesmo
 *   (table, id), faz merge do patch em vez de empilhar um novo item.
 * - Dedupe idempotente: se `dedupeKey` bater com um item já enfileirado,
 *   ignora silenciosamente (retorna o item existente).
 */
export function enqueue(m: Omit<QueuedMutation, "id" | "createdAt">): QueuedMutation {
  const q = read();

  // Dedupe idempotente.
  if (m.dedupeKey) {
    const existing = q.find((it) => it.dedupeKey === m.dedupeKey);
    if (existing) return existing;
  }

  // Coalescing de UPDATE.
  if (m.op === "update" && m.match) {
    const key = updateKey(m);
    if (key) {
      const idx = q.findIndex((it) => updateKey(it) === key);
      if (idx >= 0) {
        const prev = q[idx];
        const mergedPayload = {
          ...((prev.payload as Record<string, unknown> | undefined) ?? {}),
          ...((m.payload as Record<string, unknown> | undefined) ?? {}),
        };
        const merged: QueuedMutation = {
          ...prev,
          payload: mergedPayload,
          // Reseta backoff pois é uma nova intenção do usuário.
          attempts: 0,
          nextAttemptAt: Date.now(),
          lastError: undefined,
        };
        q[idx] = merged;
        write(q);
        return merged;
      }
    }
  }

  const item: QueuedMutation = {
    ...m,
    id: uid(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: Date.now(),
  };
  q.push(item);
  write(q);
  return item;
}

let flushing = false;
const MUTATION_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export type FlushResult = {
  sent: number;
  failed: number;
  remaining: number;
  aborted?: boolean;
  deferred?: number;
  sessionExpired?: boolean;
};

export async function flushQueue(): Promise<FlushResult> {
  if (flushing) return { sent: 0, failed: 0, remaining: queueSize() };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, failed: 0, remaining: queueSize(), aborted: true };
  }
  const queue = read();
  if (queue.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  // Session-ready gate: garante token fresco antes de mandar o batch.
  // Se falhar, NÃO tocamos na fila — preserva o trabalho do usuário para
  // uma próxima tentativa quando ele reautenticar.
  const sess = await ensureFreshSession();
  if (!sess.ok) {
    if (sess.reason === "no-session" || sess.reason === "refresh-failed") {
      console.warn("[offline-queue] sessão indisponível — flush adiado", sess.reason);
      return { sent: 0, failed: 0, remaining: queueSize(), sessionExpired: true, aborted: true };
    }
    return { sent: 0, failed: 0, remaining: queueSize(), aborted: true };
  }

  flushing = true;
  let sent = 0;
  let failed = 0;
  let deferred = 0;

  // Wake lock temporizado para batches grandes.
  const releaseLock =
    queue.length >= WAKE_LOCK_THRESHOLD_ITEMS
      ? await acquireScreenWakeLockTimed(20_000)
      : null;

  const total = queue.length;
  let processed = 0;
  emitProgress({ total, done: 0 });

  try {
    const now = Date.now();
    const remaining: QueuedMutation[] = [];
    for (const m of queue) {
      // Respeita backoff.
      if (m.nextAttemptAt && m.nextAttemptAt > now) {
        deferred++;
        remaining.push(m);
        processed++;
        emitProgress({ total, done: processed });
        continue;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ref: any = supabase.from(m.table as never);
        let p: Promise<{ error: unknown } | undefined> | undefined;
        if (m.op === "insert") p = ref.insert(m.payload);
        else if (m.op === "upsert") p = ref.upsert(m.payload);
        else if (m.op === "update") {
          let q = ref.update(m.payload);
          for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v);
          p = q;
        } else if (m.op === "delete") {
          let q = ref.delete();
          for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v);
          p = q;
        }
        const res = p ? await withTimeout(p, MUTATION_TIMEOUT_MS) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((res as any)?.error) throw (res as any).error;
        sent++;
      } catch (err) {
        const attempts = (m.attempts ?? 0) + 1;
        const wait = backoffFor(attempts);
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[offline-queue] falha (tentativa ${attempts}, retry em ${wait}ms)`, m, err);
        failed++;
        remaining.push({
          ...m,
          attempts,
          nextAttemptAt: Date.now() + wait,
          lastError: message.slice(0, 240),
        });
      }
      processed++;
      emitProgress({ total, done: processed });
    }
    write(remaining);
    return { sent, failed, remaining: remaining.length, deferred };
  } catch (err) {
    console.warn("[offline-queue] flush abortado", err);
    return { sent, failed, remaining: queueSize(), aborted: true };
  } finally {
    flushing = false;
    releaseLock?.();
    emitProgress({ total, done: total });
  }
}

export function clearQueue() {
  write([]);
}

// Onda 4 — auto-retry em background.
// Reagenda um flush quando voltar a conexão e quando o próximo item
// elegível estiver "maduro" segundo o backoff. Idempotente: chame
// `startOfflineQueueAutoRetry()` uma vez no bootstrap do app.
let autoStarted = false;
let scheduled: ReturnType<typeof setTimeout> | null = null;

function scheduleNextDue() {
  if (typeof window === "undefined") return;
  if (scheduled) { clearTimeout(scheduled); scheduled = null; }
  const q = read();
  if (q.length === 0) return;
  const now = Date.now();
  const due = q
    .map((m) => m.nextAttemptAt ?? now)
    .reduce((acc, t) => Math.min(acc, t), Infinity);
  const delay = Math.max(1_000, Math.min(15 * 60_000, due - now));
  scheduled = setTimeout(() => {
    flushQueue().finally(() => scheduleNextDue());
  }, delay);
}

export function startOfflineQueueAutoRetry() {
  if (autoStarted || typeof window === "undefined") return;
  autoStarted = true;
  window.addEventListener("online", () => {
    flushQueue().finally(() => scheduleNextDue());
  });
  subscribe(() => scheduleNextDue());
  scheduleNextDue();
}
