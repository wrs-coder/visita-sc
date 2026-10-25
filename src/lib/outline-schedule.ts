/**
 * Controle de tempo por tópico do esboço.
 *
 * Os minutos de cada tópico ficam no próprio HTML (data-minutes) e são
 * definidos no modo edição. As marcações de "concluído" ficam só neste
 * aparelho, por esboço, e somem ao zerar o cronômetro.
 */
import { useSyncExternalStore } from "react";

export interface TimedTopic {
  id: string;
  minutes: number;
}

/** Lê "(5 min)", "5 min.", "5min", "5 minutos" de um título. */
export function parseTopicMinutes(text: string): number | null {
  const m = /(\d{1,3})\s*(?:min(?:utos?)?\.?)(?![a-zà-ú])/i.exec(text ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n <= 120 ? n : null;
}

/** Minutos válidos do atributo data-minutes (ou null). */
export function normalizeMinutes(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(120, Math.round(n));
}

export interface TopicSlot {
  id: string;
  minutes: number;
  /** Minutos acumulados desde o início do esboço (até o fim deste tópico). */
  cumulative: number;
  /** Horário previsto de término (ms) — null se cronômetro não iniciado. */
  expectedEnd: number | null;
  done: boolean;
  current: boolean;
}

export interface TopicSchedule {
  slots: Record<string, TopicSlot>;
  totalMinutes: number;
  /** Desvio em segundos no último tópico concluído: >0 atrasado, <0 adiantado. */
  deviationSec: number | null;
}

/**
 * @param startedAt epoch ms em que o cronômetro começou (agora - decorrido), ou null.
 * @param done mapa id → epoch ms em que o orador concluiu o tópico.
 */
export function buildTopicSchedule(
  topics: TimedTopic[],
  startedAt: number | null,
  done: Record<string, number>,
): TopicSchedule {
  const slots: Record<string, TopicSlot> = {};
  let cumulative = 0;
  let cursor = startedAt;
  let deviationSec: number | null = null;
  let currentAssigned = false;
  for (const tp of topics) {
    cumulative += tp.minutes;
    const doneAt = done[tp.id];
    const isDone = typeof doneAt === "number";
    let expectedEnd: number | null = null;
    if (startedAt !== null && cursor !== null) {
      expectedEnd = cursor + tp.minutes * 60_000;
      if (isDone) {
        deviationSec = Math.round((doneAt - (startedAt + cumulative * 60_000)) / 1000);
        cursor = doneAt;
      } else cursor = expectedEnd;
    }
    const current = !isDone && !currentAssigned;
    if (current) currentAssigned = true;
    slots[tp.id] = { id: tp.id, minutes: tp.minutes, cumulative, expectedEnd, done: isDone, current };
  }
  return { slots, totalMinutes: cumulative, deviationSec };
}

// ---------------------------------------------------------------------------
// Concluídos por esboço (localStorage, reativo).
// ---------------------------------------------------------------------------
const PREFIX = "visita-sc:topic-done:";
const listeners = new Set<() => void>();
const cache = new Map<string, Record<string, number>>();
const EMPTY: Record<string, number> = {};

function readDone(outlineId: string): Record<string, number> {
  const hit = cache.get(outlineId);
  if (hit) return hit;
  let val: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(PREFIX + outlineId);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (parsed && typeof parsed === "object") val = parsed as Record<string, number>;
  } catch {
    /* noop */
  }
  cache.set(outlineId, val);
  return val;
}

export function toggleTopicDone(outlineId: string, topicId: string, now = Date.now()): void {
  const next = { ...readDone(outlineId) };
  if (topicId in next) delete next[topicId];
  else next[topicId] = now;
  cache.set(outlineId, next);
  try { localStorage.setItem(PREFIX + outlineId, JSON.stringify(next)); } catch { /* noop */ }
  listeners.forEach((l) => l());
}

export function clearTopicsDone(outlineId: string): void {
  cache.set(outlineId, {});
  try { localStorage.removeItem(PREFIX + outlineId); } catch { /* noop */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useTopicsDone(outlineId: string | null): Record<string, number> {
  return useSyncExternalStore(
    subscribe,
    () => (outlineId ? readDone(outlineId) : EMPTY),
    () => EMPTY,
  );
}
