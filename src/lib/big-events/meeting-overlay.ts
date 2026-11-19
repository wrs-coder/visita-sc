// Boia da reunião por cima de outros apps (Android). O serviço nativo só simula o
// relógio para exibir; cada toque (anterior/play/próxima + hora) volta para cá e é
// reaplicado com a MESMA lógica do app, então o estado salvo nunca diverge.
import { registerPlugin } from "@capacitor/core";
import { plannedMs, spentMs, tapPart, togglePause, type TimerPart, type TimerState } from "./event-timer";
import { isNativeAndroid } from "./floating-timer";

export type OverlayAction = { a: "prev" | "next" | "play"; t: number };

/** Mesma regra da boia do app: próxima/anterior a partir da ativa ou da última concluída. */
export function stepPart(parts: TimerPart[], s: TimerState, dir: 1 | -1): string | null {
  const list = [...parts].sort((a, b) => a.sort_order - b.sort_order);
  if (!list.length) return null;
  const ref = s.active ?? [...s.done].pop() ?? null;
  const i = ref ? list.findIndex((p) => p.id === ref) : -1;
  if (i < 0) return dir === 1 ? list[0].id : null;
  return list[i + dir]?.id ?? null;
}

export function applyAction(parts: TimerPart[], s: TimerState, x: OverlayAction): TimerState {
  if (x.a === "play") {
    if (s.active) return togglePause(s, x.t);
    const id = stepPart(parts, s, 1);
    return id ? tapPart(s, id, x.t) : s;
  }
  const id = stepPart(parts, s, x.a === "next" ? 1 : -1);
  return id ? tapPart(s, id, x.t) : s;
}

export function replayActions(parts: TimerPart[], s: TimerState, actions: OverlayAction[]): TimerState {
  return [...actions].sort((a, b) => a.t - b.t).reduce((acc, x) => applyAction(parts, acc, x), s);
}

export function overlayPayload(parts: TimerPart[], s: TimerState, now: number, countUp: boolean, size: string) {
  const list = [...parts].sort((a, b) => a.sort_order - b.sort_order);
  const idx = (id: string | null) => (id ? list.findIndex((p) => p.id === id) : -1);
  const last = [...s.done].pop() ?? null;
  return {
    parts: list.map((p) => ({ id: p.id, title: p.theme ?? "", plannedMs: plannedMs(p) ?? -1, spentMs: s.spent[p.id] ?? 0 })),
    active: idx(s.active), lastDone: idx(last),
    startedAt: s.startedAt ?? 0, pausedAt: s.pausedAt ?? 0,
    countUp, size, now, activeSpent: s.active ? spentMs(s, s.active, now) : 0,
  };
}

interface MeetingOverlayPlugin {
  showMeeting(o: { json: string }): Promise<void>;
  takeMeeting(): Promise<{ actions: string }>;
}
const P = registerPlugin<MeetingOverlayPlugin>("FloatingTimer");

export async function showMeetingOverlay(payload: ReturnType<typeof overlayPayload>): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try { await P.showMeeting({ json: JSON.stringify(payload) }); return true; } catch { return false; }
}

export async function takeMeetingOverlay(): Promise<OverlayAction[]> {
  if (!isNativeAndroid()) return [];
  try {
    const r = JSON.parse((await P.takeMeeting()).actions || "[]");
    return Array.isArray(r) ? r.filter((x) => (x?.a === "prev" || x?.a === "next" || x?.a === "play") && typeof x.t === "number") : [];
  } catch { return []; }
}
