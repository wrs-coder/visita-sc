// Fila offline de escritas para o Supabase.
// As mutações são salvas em localStorage e enviadas em lote quando o
// dispositivo voltar a ficar online, ou quando o usuário tocar em "Sincronizar".

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "visita-sc:offline-queue";

export type QueuedMutation = {
  id: string;
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  createdAt: string;
};

type Listener = (size: number) => void;
const listeners = new Set<Listener>();

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

export function enqueue(m: Omit<QueuedMutation, "id" | "createdAt">): QueuedMutation {
  const item: QueuedMutation = { ...m, id: uid(), createdAt: new Date().toISOString() };
  const q = read();
  q.push(item);
  write(q);
  return item;
}

let flushing = false;

export async function flushQueue(): Promise<{ sent: number; failed: number; remaining: number }> {
  if (flushing) return { sent: 0, failed: 0, remaining: queueSize() };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, failed: 0, remaining: queueSize() };
  }
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    let queue = read();
    const remaining: QueuedMutation[] = [];
    for (const m of queue) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ref: any = supabase.from(m.table as never);
        let res;
        if (m.op === "insert") res = await ref.insert(m.payload);
        else if (m.op === "upsert") res = await ref.upsert(m.payload);
        else if (m.op === "update") {
          let q = ref.update(m.payload);
          for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v);
          res = await q;
        } else if (m.op === "delete") {
          let q = ref.delete();
          for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v);
          res = await q;
        }
        if (res?.error) throw res.error;
        sent++;
      } catch (err) {
        // Erro de rede → mantém para retry. Erro de validação → também mantém
        // para que o usuário veja na próxima sync (poderemos sofisticar depois).
        console.warn("[offline-queue] falha ao enviar", m, err);
        failed++;
        remaining.push(m);
      }
    }
    write(remaining);
    queue = remaining;
    return { sent, failed, remaining: queue.length };
  } finally {
    flushing = false;
  }
}

export function clearQueue() {
  write([]);
}
