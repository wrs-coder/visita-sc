// Liga o Controle de tempo ao espelho do relógio (tablet/TV). Só presentation + transporte:
// o estado do cronômetro continua sendo o de event-timer.ts, sem nenhuma mudança.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildSnap, newMirrorCode, type MirrorSnap } from "@/lib/big-events/timer-mirror";
import type { TimerMode, TimerPart, TimerState } from "@/lib/big-events/event-timer";
import {
  loadMirrorPrefs, saveMirrorPrefs, openOnlineMirror, startLocalMirror, stopLocalMirror, updateLocalMirror,
  localMirrorInfo, localMirrorSupported, type MirrorPrefs, type OnlineMirror,
} from "@/lib/big-events/timer-mirror-link";
import { darkTokenColors, localMirrorHtml } from "@/lib/big-events/timer-mirror-page";

export interface LocalState { status: "off" | "starting" | "on" | "nowifi" | "error"; ip: string | null; port: number; viewers: number }

export function useTimerMirror(ev: { id: string; name: string }, parts: TimerPart[], s: TimerState, mode: TimerMode) {
  const { t } = useTranslation();
  const [prefs, setPrefsState] = useState<MirrorPrefs>(() => loadMirrorPrefs(ev.id));
  const setPrefs = useCallback((fn: (p: MirrorPrefs) => MirrorPrefs) => setPrefsState((p) => { const n = fn(p); saveMirrorPrefs(ev.id, n); return n; }), [ev.id]);
  const [viewers, setViewers] = useState(0);
  const [local, setLocal] = useState<LocalState>({ status: "off", ip: null, port: 0, viewers: 0 });

  const labels = { co: t("timerMirror.co"), branch: t("timerMirror.branch") };
  const snapRef = useRef<() => MirrorSnap>(() => buildSnap(ev.name, parts, s, mode, Date.now(), labels));
  snapRef.current = () => buildSnap(ev.name, parts, s, mode, Date.now(), labels);

  // Internet
  const onlineRef = useRef<OnlineMirror | null>(null);
  useEffect(() => {
    if (!prefs.online) return;
    let alive = true, link: OnlineMirror | null = null;
    void openOnlineMirror(prefs.code, () => snapRef.current(), (n) => alive && setViewers(n))
      .then((l) => { if (alive) { link = l; onlineRef.current = l; } else l.close(); })
      .catch(() => { /* sem internet: o relógio local continua */ });
    return () => { alive = false; onlineRef.current = null; link?.close(); setViewers(0); };
  }, [prefs.online, prefs.code]);

  // Rede local (Android)
  const startLocal = useCallback(async () => {
    if (!localMirrorSupported()) return;
    setLocal((l) => ({ ...l, status: "starting" }));
    try {
      const html = localMirrorHtml({
        title: t("timerMirror.pageTitle"), live: t("timerMirror.live"), paused: t("timerMirror.paused"), noSignal: t("timerMirror.noSignal"),
        speaker: t("timerMirror.speaker"), end: t("timerMirror.end"), nextSpeaker: t("timerMirror.nextSpeaker"), over: t("timerMirror.over"),
        nextPart: t("timerMirror.nextPart"), waiting: t("timerMirror.waiting"), tapFull: t("timerMirror.tapFull"),
        partOf: t("timerMirror.partOf", { i: "{i}", n: "{n}" }),
      }, darkTokenColors());
      const r = await startLocalMirror(html);
      await updateLocalMirror(snapRef.current());
      setLocal({ status: r.ip ? "on" : "nowifi", ip: r.ip, port: r.port, viewers: 0 });
    } catch {
      setLocal((l) => ({ ...l, status: "error" }));
    }
  }, [t]);
  useEffect(() => {
    if (!prefs.local || !localMirrorSupported()) return;
    void startLocal();
    const beat = setInterval(() => {
      void updateLocalMirror(snapRef.current());
      void localMirrorInfo().then((i) => { if (i) setLocal((l) => ({ ...l, ip: i.ip ?? l.ip, viewers: i.viewers, status: l.status === "nowifi" && i.ip ? "on" : l.status })); });
    }, 4000);
    return () => { clearInterval(beat); void stopLocalMirror(); setLocal({ status: "off", ip: null, port: 0, viewers: 0 }); };
  }, [prefs.local, startLocal]);

  // Cada toque no cronômetro (ou troca de modo) vai na hora para os tablets.
  useEffect(() => {
    onlineRef.current?.push();
    if (prefs.local) void updateLocalMirror(snapRef.current());
  }, [s, mode, parts, prefs.local]);

  return {
    prefs, viewers, local,
    active: prefs.online || prefs.local,
    setOnline: (on: boolean) => setPrefs((p) => ({ ...p, online: on })),
    setLocalOn: (on: boolean) => setPrefs((p) => ({ ...p, local: on })),
    retryLocal: () => void startLocal(),
    renewCode: () => setPrefs((p) => ({ ...p, code: newMirrorCode() })),
  };
}
export type TimerMirrorApi = ReturnType<typeof useTimerMirror>;
