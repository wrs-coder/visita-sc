/** Relógio próprio do "Tempo por tópico" — independente do cronômetro geral da pauta. */
import { useCallback, useEffect, useState } from "react";

export type TopicClock = { index: number; running: boolean; startedAt: number | null; usedSec: Record<string, number> };
export const emptyClock = (): TopicClock => ({ index: 0, running: false, startedAt: null, usedSec: {} });

/** Fecha o trecho em andamento no tópico atual (sem mudar running). */
function settle(c: TopicClock, ids: string[], now: number): TopicClock {
  if (!c.running || c.startedAt == null) return c;
  const id = ids[c.index];
  const add = Math.max(0, (now - c.startedAt) / 1000);
  return { ...c, startedAt: now, usedSec: id ? { ...c.usedSec, [id]: (c.usedSec[id] ?? 0) + add } : c.usedSec };
}
export function usedOf(c: TopicClock, ids: string[], i: number, now: number): number {
  const id = ids[i]; if (!id) return 0;
  const base = c.usedSec[id] ?? 0;
  return c.running && c.index === i && c.startedAt != null ? base + Math.max(0, (now - c.startedAt) / 1000) : base;
}
export function select(c: TopicClock, ids: string[], i: number, now: number): TopicClock {
  if (!ids.length) return c;
  const idx = Math.min(Math.max(0, i), ids.length - 1);
  return { ...settle(c, ids, now), index: idx };
}
export const next = (c: TopicClock, ids: string[], now: number) => select(c, ids, c.index + 1, now);
export const prev = (c: TopicClock, ids: string[], now: number) => select(c, ids, c.index - 1, now);
export function toggle(c: TopicClock, ids: string[], now: number): TopicClock {
  if (c.running) return { ...settle(c, ids, now), running: false, startedAt: null };
  return { ...c, running: true, startedAt: now };
}
export function resetCurrent(c: TopicClock, ids: string[], now: number): TopicClock {
  const id = ids[c.index]; const s = settle(c, ids, now);
  const usedSec = { ...s.usedSec }; if (id) delete usedSec[id];
  return { ...s, usedSec, startedAt: s.running ? now : null };
}
export const resetAll = (c: TopicClock): TopicClock => ({ ...emptyClock(), index: c.index });

const key = (v: string) => `agendaTopicClock.${v}`;
const EVT = "agenda-topic-clock";
function read(v: string): TopicClock {
  try { const r = localStorage.getItem(key(v)); if (r) return { ...emptyClock(), ...JSON.parse(r) }; } catch { /* */ }
  return emptyClock();
}

export function useAgendaTopicClock(visitId: string, ids: string[]) {
  const [c, setC] = useState<TopicClock>(emptyClock);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const r = () => setC(read(visitId)); r();
    window.addEventListener(EVT, r); window.addEventListener("storage", r);
    return () => { window.removeEventListener(EVT, r); window.removeEventListener("storage", r); };
  }, [visitId]);
  useEffect(() => { if (!c.running) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [c.running]);
  const apply = useCallback((fn: (c: TopicClock, ids: string[], now: number) => TopicClock) => {
    const n = fn(read(visitId), ids, Date.now());
    try { localStorage.setItem(key(visitId), JSON.stringify(n)); } catch { /* */ }
    setC(n); setNow(Date.now()); window.dispatchEvent(new Event(EVT));
  }, [visitId, ids]);
  const index = Math.min(c.index, Math.max(0, ids.length - 1));
  return {
    clock: c, index, running: c.running,
    used: (i: number) => usedOf(c, ids, i, now),
    toggle: () => apply(toggle), next: () => apply(next), prev: () => apply(prev),
    select: (i: number) => apply((x, d, t) => select(x, d, i, t)),
    resetCurrent: () => apply(resetCurrent), resetAll: () => apply((x) => resetAll(x)),
  };
}
