/**
 * Temas de cor do OutlineTimer (Missão 06.1).
 *
 * "auto" mantém o semafórico (verde/âmbar/vermelho) gerido pelo hook.
 * Demais temas aplicam cores fixas de alto contraste no chip + display.
 * Preferência global por usuário, persistida em localStorage.
 */
import { useEffect, useState, useCallback } from "react";

export type TimerThemeId =
  | "auto"
  | "yellow-on-black"
  | "black-on-yellow"
  | "red-vivid"
  | "white-on-black"
  | "green-neon";

export interface TimerThemePreset {
  id: TimerThemeId;
  /** chave i18n */
  labelKey: string;
  /** classes Tailwind aplicadas ao chip (apenas quando id !== "auto") */
  chipBg: string;
  /** classes Tailwind aplicadas ao display MM:SS */
  chipText: string;
  /** classes Tailwind aplicadas aos ícones Play/Pause/Reset/Timer */
  iconColor: string;
  /** preview "MM" usado no popover */
  swatchBg: string;
  swatchText: string;
}

export const TIMER_THEMES: TimerThemePreset[] = [
  {
    id: "auto",
    labelKey: "personalOutlines.timer.themeAuto",
    chipBg: "",
    chipText: "",
    iconColor: "",
    swatchBg: "bg-background",
    swatchText: "text-emerald-600",
  },
  {
    id: "yellow-on-black",
    labelKey: "personalOutlines.timer.themeYellowOnBlack",
    chipBg: "bg-black border-yellow-300/60",
    chipText: "text-yellow-300",
    iconColor: "text-yellow-300 hover:bg-yellow-300/10",
    swatchBg: "bg-black",
    swatchText: "text-yellow-300",
  },
  {
    id: "black-on-yellow",
    labelKey: "personalOutlines.timer.themeBlackOnYellow",
    chipBg: "bg-yellow-300 border-black/40",
    chipText: "text-black",
    iconColor: "text-black hover:bg-black/10",
    swatchBg: "bg-yellow-300",
    swatchText: "text-black",
  },
  {
    id: "red-vivid",
    labelKey: "personalOutlines.timer.themeRedVivid",
    chipBg: "bg-white border-red-600/60",
    chipText: "text-red-600",
    iconColor: "text-red-600 hover:bg-red-600/10",
    swatchBg: "bg-white",
    swatchText: "text-red-600",
  },
  {
    id: "white-on-black",
    labelKey: "personalOutlines.timer.themeWhiteOnBlack",
    chipBg: "bg-black border-white/40",
    chipText: "text-white",
    iconColor: "text-white hover:bg-white/10",
    swatchBg: "bg-black",
    swatchText: "text-white",
  },
  {
    id: "green-neon",
    labelKey: "personalOutlines.timer.themeGreenNeon",
    chipBg: "bg-black border-emerald-400/60",
    chipText: "text-emerald-400",
    iconColor: "text-emerald-400 hover:bg-emerald-400/10",
    swatchBg: "bg-black",
    swatchText: "text-emerald-400",
  },
];

const STORAGE_KEY = "visita-sc:outline-timer-theme";
const DEFAULT_ID: TimerThemeId = "auto";

function isValidId(v: string | null): v is TimerThemeId {
  return !!v && TIMER_THEMES.some((p) => p.id === v);
}

function readId(): TimerThemeId {
  if (typeof window === "undefined") return DEFAULT_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isValidId(raw) ? raw : DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function getTimerThemePreset(id: TimerThemeId): TimerThemePreset {
  return TIMER_THEMES.find((p) => p.id === id) ?? TIMER_THEMES[0];
}

export interface UseTimerThemeResult {
  themeId: TimerThemeId;
  preset: TimerThemePreset;
  setThemeId: (id: TimerThemeId) => void;
}

export function useTimerTheme(): UseTimerThemeResult {
  const [themeId, setThemeIdState] = useState<TimerThemeId>(() => readId());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = isValidId(e.newValue) ? e.newValue : DEFAULT_ID;
      setThemeIdState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeId = useCallback((id: TimerThemeId) => {
    setThemeIdState(id);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
      // Sincroniza dentro da mesma aba (storage event não dispara para o
      // próprio writer): disparamos um evento sintético.
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

  return { themeId, preset: getTimerThemePreset(themeId), setThemeId };
}
