/**
 * useOutlineTimer (Onda 7.12 / Missão 06).
 *
 * Cronômetro por esboço, 100% local. Persistência em localStorage com
 * recuperação de drift e sincronização cross-surface via BroadcastChannel
 * (inline + banner fullscreen + dashboard podem coexistir).
 *
 * Veja .lovable/plan.md para regras de negócio (presets, alertas, etc.).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acquireScreenWakeLock,
  releaseScreenWakeLock,
} from "@/lib/wake-lock";

export type TimerMode = "countdown" | "countup";
export type AlertLevel = "green" | "amber" | "red";

export interface TimerSnapshot {
  mode: TimerMode;
  targetSec: number;
  elapsedSec: number;
  isRunning: boolean;
  lastTickAt: number; // ms epoch
}

const STORAGE_PREFIX = "visita-sc:outline-timer:";
const CHANNEL_NAME = "visita-sc:outline-timer";
const DEFAULT_TARGET_SEC = 30 * 60;
const MIN_TARGET_SEC = 60;
const MAX_TARGET_SEC = 120 * 60;

function keyFor(outlineId: string): string {
  return `${STORAGE_PREFIX}${outlineId}`;
}

function defaultSnapshot(): TimerSnapshot {
  return {
    mode: "countdown",
    targetSec: DEFAULT_TARGET_SEC,
    elapsedSec: 0,
    isRunning: false,
    lastTickAt: Date.now(),
  };
}

function clampTarget(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULT_TARGET_SEC;
  return Math.min(MAX_TARGET_SEC, Math.max(MIN_TARGET_SEC, Math.round(sec)));
}

function readSnapshot(outlineId: string): TimerSnapshot {
  if (typeof window === "undefined") return defaultSnapshot();
  try {
    const raw = window.localStorage.getItem(keyFor(outlineId));
    if (!raw) return defaultSnapshot();
    const parsed = JSON.parse(raw) as Partial<TimerSnapshot>;
    const base: TimerSnapshot = {
      mode: parsed.mode === "countup" ? "countup" : "countdown",
      targetSec: clampTarget(Number(parsed.targetSec) || DEFAULT_TARGET_SEC),
      elapsedSec: Math.max(0, Number(parsed.elapsedSec) || 0),
      isRunning: !!parsed.isRunning,
      lastTickAt: Number(parsed.lastTickAt) || Date.now(),
    };
    // Drift recovery: se estava rodando, soma o tempo que passou desde o
    // último tick gravado. Cobre reload, fechamento acidental, navegação.
    if (base.isRunning) {
      const drift = Math.max(0, Math.floor((Date.now() - base.lastTickAt) / 1000));
      base.elapsedSec += drift;
      base.lastTickAt = Date.now();
    }
    return base;
  } catch {
    return defaultSnapshot();
  }
}

function writeSnapshot(outlineId: string, snap: TimerSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(outlineId), JSON.stringify(snap));
  } catch {
    /* quota / privacy mode — ignora */
  }
}

// Canal compartilhado em todo o módulo (uma instância por aba).
let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
  }
  return channel;
}

interface BroadcastMessage {
  outlineId: string;
  snapshot: TimerSnapshot;
  senderId: string;
}

function alertLevelFor(progressPct: number): AlertLevel {
  if (progressPct >= 95) return "red";
  if (progressPct >= 80) return "amber";
  return "green";
}

export interface UseOutlineTimerResult {
  mode: TimerMode;
  targetSec: number;
  elapsedSec: number;
  remainingSec: number;
  isRunning: boolean;
  progressPct: number;
  alertLevel: AlertLevel;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  toggleMode: () => void;
  setTarget: (seconds: number) => void;
}

const NOOP_RESULT: UseOutlineTimerResult = {
  mode: "countdown",
  targetSec: DEFAULT_TARGET_SEC,
  elapsedSec: 0,
  remainingSec: DEFAULT_TARGET_SEC,
  isRunning: false,
  progressPct: 0,
  alertLevel: "green",
  start: () => {},
  pause: () => {},
  toggle: () => {},
  reset: () => {},
  toggleMode: () => {},
  setTarget: () => {},
};

export function useOutlineTimer(outlineId: string | null | undefined): UseOutlineTimerResult {
  const safeId = outlineId || "";
  const [snap, setSnap] = useState<TimerSnapshot>(() =>
    safeId ? readSnapshot(safeId) : defaultSnapshot(),
  );
  const snapRef = useRef<TimerSnapshot>(snap);
  snapRef.current = snap;
  const senderIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const wakeHeldRef = useRef<boolean>(false);

  // Re-hidrata ao trocar de nota.
  useEffect(() => {
    if (!safeId) {
      setSnap(defaultSnapshot());
      return;
    }
    setSnap(readSnapshot(safeId));
  }, [safeId]);

  // Persiste + transmite cada mudança.
  const commit = useCallback(
    (next: TimerSnapshot, broadcast = true) => {
      snapRef.current = next;
      setSnap(next);
      if (!safeId) return;
      writeSnapshot(safeId, next);
      if (broadcast) {
        const ch = getChannel();
        if (ch) {
          try {
            ch.postMessage({
              outlineId: safeId,
              snapshot: next,
              senderId: senderIdRef.current,
            } satisfies BroadcastMessage);
          } catch {
            /* noop */
          }
        }
      }
    },
    [safeId],
  );

  // Escuta sinais de outras instâncias / abas.
  useEffect(() => {
    if (!safeId || typeof window === "undefined") return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== keyFor(safeId) || !e.newValue) return;
      try {
        const incoming = JSON.parse(e.newValue) as TimerSnapshot;
        commit(incoming, false);
      } catch {
        /* noop */
      }
    };
    window.addEventListener("storage", onStorage);

    const ch = getChannel();
    const onMessage = (event: MessageEvent<BroadcastMessage>) => {
      const data = event.data;
      if (!data || data.outlineId !== safeId) return;
      if (data.senderId === senderIdRef.current) return;
      commit(data.snapshot, false);
    };
    ch?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("storage", onStorage);
      ch?.removeEventListener("message", onMessage);
    };
  }, [safeId, commit]);

  // Tick (1s) enquanto rodando.
  useEffect(() => {
    if (!snap.isRunning) return;
    const id = window.setInterval(() => {
      const cur = snapRef.current;
      if (!cur.isRunning) return;
      const nextElapsed = cur.elapsedSec + 1;
      const next: TimerSnapshot = {
        ...cur,
        elapsedSec: nextElapsed,
        lastTickAt: Date.now(),
        // Em countdown, pausa automaticamente ao chegar no alvo.
        isRunning:
          cur.mode === "countdown" && nextElapsed >= cur.targetSec
            ? false
            : true,
      };
      commit(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [snap.isRunning, commit]);

  // Wakelock acoplado ao isRunning.
  useEffect(() => {
    if (snap.isRunning && !wakeHeldRef.current) {
      wakeHeldRef.current = true;
      void acquireScreenWakeLock();
    } else if (!snap.isRunning && wakeHeldRef.current) {
      wakeHeldRef.current = false;
      void releaseScreenWakeLock();
    }
  }, [snap.isRunning]);

  // Libera o wakelock ao desmontar se ainda estiver segurando.
  useEffect(() => {
    return () => {
      if (wakeHeldRef.current) {
        wakeHeldRef.current = false;
        void releaseScreenWakeLock();
      }
    };
  }, []);

  // Ações
  const start = useCallback(() => {
    const cur = snapRef.current;
    if (cur.isRunning) return;
    // Se em countdown e já estourou, reinicia para o alvo cheio.
    const elapsed =
      cur.mode === "countdown" && cur.elapsedSec >= cur.targetSec
        ? 0
        : cur.elapsedSec;
    commit({ ...cur, elapsedSec: elapsed, isRunning: true, lastTickAt: Date.now() });
  }, [commit]);

  const pause = useCallback(() => {
    const cur = snapRef.current;
    if (!cur.isRunning) return;
    commit({ ...cur, isRunning: false, lastTickAt: Date.now() });
  }, [commit]);

  const toggle = useCallback(() => {
    if (snapRef.current.isRunning) pause();
    else start();
  }, [pause, start]);

  const reset = useCallback(() => {
    const cur = snapRef.current;
    commit({ ...cur, elapsedSec: 0, isRunning: false, lastTickAt: Date.now() });
  }, [commit]);

  const toggleMode = useCallback(() => {
    const cur = snapRef.current;
    commit({
      ...cur,
      mode: cur.mode === "countdown" ? "countup" : "countdown",
      lastTickAt: Date.now(),
    });
  }, [commit]);

  const setTarget = useCallback(
    (seconds: number) => {
      const cur = snapRef.current;
      const target = clampTarget(seconds);
      commit({
        ...cur,
        targetSec: target,
        // Se já tinha estourado em countdown, "destrava" e zera para o novo alvo.
        elapsedSec:
          cur.mode === "countdown" && cur.elapsedSec >= cur.targetSec
            ? 0
            : Math.min(cur.elapsedSec, target),
        lastTickAt: Date.now(),
      });
    },
    [commit],
  );

  const remainingSec = Math.max(0, snap.targetSec - snap.elapsedSec);
  const progressPct = useMemo(() => {
    if (snap.targetSec <= 0) return 0;
    return Math.min(100, (snap.elapsedSec / snap.targetSec) * 100);
  }, [snap.elapsedSec, snap.targetSec]);
  const alertLevel = alertLevelFor(progressPct);

  if (!safeId) return NOOP_RESULT;

  return {
    mode: snap.mode,
    targetSec: snap.targetSec,
    elapsedSec: snap.elapsedSec,
    remainingSec,
    isRunning: snap.isRunning,
    progressPct,
    alertLevel,
    start,
    pause,
    toggle,
    reset,
    toggleMode,
    setTarget,
  };
}

export function formatMMSS(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
