/**
 * Tamanho do visor do OutlineTimer (Missão 06.2).
 *
 * Três escalas: normal / large / huge. Persistido em localStorage,
 * sincronizado entre superfícies (toolbar + banner fullscreen) via
 * StorageEvent — análogo a useTimerTheme.
 */
import { useCallback, useEffect, useState } from "react";

export type TimerSizeId = "normal" | "large" | "huge";

export interface TimerSizePreset {
  id: TimerSizeId;
  /** classes Tailwind aplicadas ao display MM:SS em variant="toolbar" */
  toolbarText: string;
  /** classes Tailwind aplicadas ao display MM:SS em variant="fullscreen" */
  fullscreenText: string;
  /** classes Tailwind aplicadas à hora de término (HH:MM) em variant="toolbar" */
  toolbarEndLabel: string;
  /** classes Tailwind aplicadas à hora de término (HH:MM) em variant="fullscreen" */
  fullscreenEndLabel: string;
}

export const TIMER_SIZES: TimerSizePreset[] = [
  {
    id: "normal",
    toolbarText: "text-xs px-1",
    fullscreenText: "text-lg px-1",
    toolbarEndLabel: "text-xs px-1",
    fullscreenEndLabel: "text-lg px-1",
  },
  {
    id: "large",
    toolbarText: "text-sm px-1.5",
    fullscreenText: "text-2xl px-2 py-0.5",
    toolbarEndLabel: "text-sm px-1.5",
    fullscreenEndLabel: "text-2xl px-2 py-0.5",
  },
  {
    id: "huge",
    toolbarText: "text-base px-2",
    fullscreenText: "text-4xl px-3 py-1",
    toolbarEndLabel: "text-base px-2",
    fullscreenEndLabel: "text-4xl px-3 py-1",
  },
];

const STORAGE_KEY = "visita-sc:outline-timer-size";
const DEFAULT_ID: TimerSizeId = "normal";

function isValidId(v: string | null): v is TimerSizeId {
  return !!v && TIMER_SIZES.some((p) => p.id === v);
}

function readId(): TimerSizeId {
  if (typeof window === "undefined") return DEFAULT_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isValidId(raw) ? raw : DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function getTimerSizePreset(id: TimerSizeId): TimerSizePreset {
  return TIMER_SIZES.find((p) => p.id === id) ?? TIMER_SIZES[0];
}

export function nextSize(id: TimerSizeId): TimerSizeId {
  const i = TIMER_SIZES.findIndex((p) => p.id === id);
  return TIMER_SIZES[Math.min(TIMER_SIZES.length - 1, i + 1)].id;
}

export function prevSize(id: TimerSizeId): TimerSizeId {
  const i = TIMER_SIZES.findIndex((p) => p.id === id);
  return TIMER_SIZES[Math.max(0, i - 1)].id;
}

export function isMaxSize(id: TimerSizeId): boolean {
  return TIMER_SIZES[TIMER_SIZES.length - 1].id === id;
}

export function isMinSize(id: TimerSizeId): boolean {
  return TIMER_SIZES[0].id === id;
}

export interface UseTimerSizeResult {
  sizeId: TimerSizeId;
  preset: TimerSizePreset;
  setSizeId: (id: TimerSizeId) => void;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

export function useTimerSize(): UseTimerSizeResult {
  const [sizeId, setSizeIdState] = useState<TimerSizeId>(() => readId());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = isValidId(e.newValue) ? e.newValue : DEFAULT_ID;
      setSizeIdState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setSizeId = useCallback((id: TimerSizeId) => {
    setSizeIdState(id);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: id,
        }),
      );
    } catch {
      /* noop */
    }
  }, []);

  const increase = useCallback(() => {
    setSizeId(nextSize(readId()));
  }, [setSizeId]);

  const decrease = useCallback(() => {
    setSizeId(prevSize(readId()));
  }, [setSizeId]);

  return {
    sizeId,
    preset: getTimerSizePreset(sizeId),
    setSizeId,
    increase,
    decrease,
    canIncrease: !isMaxSize(sizeId),
    canDecrease: !isMinSize(sizeId),
  };
}
