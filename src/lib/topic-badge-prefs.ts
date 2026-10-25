/**
 * Preferências visuais da pílula de tempo por tópico (só neste aparelho).
 * Nunca entram no HTML do esboço.
 */
import { useSyncExternalStore } from "react";

export type BadgeSize = "sm" | "md" | "lg";
export type BadgePosition = "left" | "center" | "right";
export interface BadgePrefs {
  size: BadgeSize;
  /** 30–100 (%) */
  opacity: number;
  position: BadgePosition;
}

export const DEFAULT_BADGE_PREFS: BadgePrefs = { size: "sm", opacity: 60, position: "right" };
const KEY = "visita-sc:topic-badge-prefs";

export function normalizeBadgePrefs(raw: unknown): BadgePrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof BadgePrefs, unknown>>;
  const size: BadgeSize = r.size === "md" || r.size === "lg" || r.size === "sm" ? r.size : DEFAULT_BADGE_PREFS.size;
  const position: BadgePosition =
    r.position === "left" || r.position === "center" || r.position === "right" ? r.position : DEFAULT_BADGE_PREFS.position;
  const n = Number(r.opacity);
  const opacity = Number.isFinite(n) && n >= 30 && n <= 100 ? Math.round(n) : DEFAULT_BADGE_PREFS.opacity;
  return { size, opacity, position };
}

const listeners = new Set<() => void>();
let cache: BadgePrefs | null = null;

function read(): BadgePrefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = normalizeBadgePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    cache = DEFAULT_BADGE_PREFS;
  }
  return cache;
}

export function setBadgePrefs(patch: Partial<BadgePrefs>): void {
  cache = normalizeBadgePrefs({ ...read(), ...patch });
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("[topic-badge-prefs] save failed", err);
  }
  listeners.forEach((l) => l());
}

export function resetBadgePrefs(): void {
  cache = DEFAULT_BADGE_PREFS;
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("[topic-badge-prefs] reset failed", err);
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useBadgePrefs(): BadgePrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_BADGE_PREFS);
}
