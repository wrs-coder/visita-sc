/**
 * Tópicos recolhíveis dos esboços — estado de "recolhido" guardado só neste
 * aparelho (localStorage), por id de tópico (ids aleatórios e únicos).
 * O conteúdo do tópico fica no próprio HTML do esboço:
 *   <div data-type="outline-topic" data-topic-id="…" data-title="…">…blocos…</div>
 */
import { useSyncExternalStore } from "react";

export const OUTLINE_TOPIC_TYPE = "outline-topic";
const STORAGE_KEY = "visita-sc:outline-topics-collapsed";

type CollapsedMap = Record<string, true>;

let cache: CollapsedMap | null = null;
const listeners = new Set<() => void>();

function read(): CollapsedMap {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    cache = parsed && typeof parsed === "object" ? (parsed as CollapsedMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: CollapsedMap) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function isTopicCollapsed(id: string): boolean {
  return !!read()[id];
}

export function setTopicsCollapsed(ids: string[], collapsed: boolean) {
  const next = { ...read() };
  for (const id of ids) {
    if (!id) continue;
    if (collapsed) next[id] = true;
    else delete next[id];
  }
  write(next);
}

export function toggleTopic(id: string) {
  setTopicsCollapsed([id], !isTopicCollapsed(id));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: CollapsedMap = {};

/** Hook reativo: mapa de tópicos recolhidos (vazio no servidor). */
export function useCollapsedTopics(): CollapsedMap {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function makeTopicId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
