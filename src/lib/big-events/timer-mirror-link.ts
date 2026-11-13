// Transporte do espelho do relógio.
// Internet: canal ao vivo da nuvem só de mensagens (nada é gravado no banco), nome = código aleatório.
// Rede local (sem internet): mini-servidor do aplicativo Android no Wi‑Fi do salão (TimerMirrorServer).
import { Capacitor, registerPlugin } from "@capacitor/core";
import { mirrorChannel, newMirrorCode, isMirrorCode, type MirrorSnap } from "./timer-mirror";

export interface MirrorPrefs { code: string; online: boolean; local: boolean }
const prefsKey = (eventId: string) => `bigEventTimer.mirror.${eventId}`;
export function loadMirrorPrefs(eventId: string): MirrorPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(prefsKey(eventId)) ?? "null") as Partial<MirrorPrefs> | null;
    if (raw && typeof raw.code === "string" && isMirrorCode(raw.code)) return { code: raw.code, online: raw.online === true, local: raw.local === true };
  } catch { /* */ }
  return { code: newMirrorCode(), online: false, local: false };
}
export function saveMirrorPrefs(eventId: string, p: MirrorPrefs): void {
  try { localStorage.setItem(prefsKey(eventId), JSON.stringify(p)); } catch { /* */ }
}

/** Conta aparelhos que deram sinal nos últimos 25 s. */
export function countRecent(seen: Map<string, number>, now: number, windowMs = 25_000): number {
  let n = 0;
  for (const [k, t] of seen) { if (now - t <= windowMs) n++; else seen.delete(k); }
  return n;
}

export interface OnlineMirror { push(): void; close(): void }
/** Lado do superintendente: envia o retrato a cada mudança, a cada 4 s e quando um tablet chega. */
export async function openOnlineMirror(code: string, getSnap: () => MirrorSnap, onViewers: (n: number) => void): Promise<OnlineMirror> {
  const { supabase } = await import("@/integrations/supabase/client");
  const ch = supabase.channel(mirrorChannel(code), { config: { broadcast: { self: false } } });
  const seen = new Map<string, number>();
  let ready = false, closed = false;
  const push = () => { if (ready && !closed) void ch.send({ type: "broadcast", event: "snap", payload: getSnap() }); };
  ch.on("broadcast", { event: "hello" }, ({ payload }) => {
    const id = typeof payload?.id === "string" ? payload.id.slice(0, 40) : null;
    if (id) { seen.set(id, Date.now()); onViewers(countRecent(seen, Date.now())); }
    push();
  });
  ch.subscribe((st) => { if (st === "SUBSCRIBED") { ready = true; push(); } });
  const beat = setInterval(() => { push(); onViewers(countRecent(seen, Date.now())); }, 4000);
  return {
    push,
    close: () => { closed = true; clearInterval(beat); onViewers(0); void supabase.removeChannel(ch); },
  };
}

// ---- Rede local (Android) ----
interface TimerMirrorServerPlugin {
  start(o: { port: number; html: string }): Promise<{ ip: string | null; port: number }>;
  update(o: { json: string }): Promise<void>;
  stop(): Promise<void>;
  info(): Promise<{ running: boolean; ip: string | null; port: number; viewers: number }>;
}
const TMS = registerPlugin<TimerMirrorServerPlugin>("TimerMirrorServer");
export const localMirrorSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
export const LOCAL_MIRROR_PORT = 8080;

export async function startLocalMirror(html: string): Promise<{ ip: string | null; port: number }> {
  if (!localMirrorSupported()) throw new Error("unsupported");
  return TMS.start({ port: LOCAL_MIRROR_PORT, html });
}
export async function updateLocalMirror(snap: MirrorSnap): Promise<void> {
  if (!localMirrorSupported()) return;
  try { await TMS.update({ json: JSON.stringify(snap) }); } catch { /* APK antigo */ }
}
export async function stopLocalMirror(): Promise<void> {
  if (!localMirrorSupported()) return;
  try { await TMS.stop(); } catch { /* */ }
}
export async function localMirrorInfo(): Promise<{ running: boolean; ip: string | null; port: number; viewers: number } | null> {
  if (!localMirrorSupported()) return null;
  try { return await TMS.info(); } catch { return null; }
}
export const localMirrorUrl = (ip: string, port: number) => (port === 80 ? `http://${ip}` : `http://${ip}:${port}`);
