import { appConfirm } from "@/components/ui/app-dialogs";
// Boia do controle de tempo da reunião (minimizado): mostra o tempo da parte atual e
// controla anterior / iniciar-pausar / próxima, lendo e gravando o MESMO estado da tela
// inteira (event-timer.ts, relógio real) — nada reinicia. Tamanho guardado no aparelho.
import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight, Maximize2, Pause, Play, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FloatingDock } from "@/components/notes/FloatingDock";
import {
  displayClock, loadMode, loadTimer, plannedMs, saveTimer, spentMs, tapPart, togglePause, type TimerPart, type TimerState,
} from "@/lib/big-events/event-timer";
import { cn } from "@/lib/utils";
import { overlayGranted, requestOverlay, isNativeAndroid } from "@/lib/big-events/floating-timer";
import { overlayPayload, replayActions, showMeetingOverlay, takeMeetingOverlay, stepPart as stepPartShared } from "@/lib/big-events/meeting-overlay";

const ASKED_KEY = "meeting.overlayAsked";

export type DockSize = "s" | "m" | "l";
const SIZE_KEY = "meeting.dockSize";
const loadSize = (): DockSize => { try { const v = localStorage.getItem(SIZE_KEY); return v === "s" || v === "l" ? v : "m"; } catch { return "m"; } };
const NEXT_SIZE: Record<DockSize, DockSize> = { s: "m", m: "l", l: "s" };

/** Próxima/anterior parte a partir da ativa (ou da última concluída). */
export const stepPart = stepPartShared;

export default function MeetingFloatingTimer({ timerKey, parts, onOpen }: { timerKey: string; parts: TimerPart[]; onOpen: () => void }) {
  const { t } = useTranslation();
  const [s, setS] = useState<TimerState>(() => loadTimer(timerKey));
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState<DockSize>("m");
  useEffect(() => { setSize(loadSize()); }, []);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const update = (fn: (x: TimerState) => TimerState) => setS((x) => { const n = fn(loadTimer(timerKey) ?? x); saveTimer(timerKey, n); return n; });
  // Fora do app (Android): boia nativa por cima de outros apps; ao voltar, reaplica os toques.
  useEffect(() => {
    if (!isNativeAndroid()) return;
    let off: (() => void) | undefined; let alive = true;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", async ({ isActive }) => {
      if (isActive) {
        const acts = await takeMeetingOverlay();
        if (acts.length) { const n = replayActions(parts, loadTimer(timerKey), acts); saveTimer(timerKey, n); setS(n); }
        setNow(Date.now());
      } else {
        const cur = loadTimer(timerKey);
        await showMeetingOverlay(overlayPayload(parts, cur, Date.now(), loadMode() === "up", loadSize()));
      }
    })).then((h) => { if (alive) off = () => void h.remove(); else void h.remove(); });
    // Pede a permissão "Sobrepor a outros apps" uma única vez.
    void overlayGranted().then(async (ok) => {
      if (ok) return;
      try { if (localStorage.getItem(ASKED_KEY)) return; localStorage.setItem(ASKED_KEY, "1"); } catch { return; }
      if (await appConfirm(t("meeting.overlayAsk", { defaultValue: "Para o tempo ficar na tela fora do Visita SC, permita \"Sobrepor a outros apps\"." }))) void requestOverlay();
    });
    return () => { alive = false; off?.(); void takeMeetingOverlay(); };
  }, [timerKey, parts, t]);
  const cycleSize = () => setSize((z) => { const n = NEXT_SIZE[z]; try { localStorage.setItem(SIZE_KEY, n); } catch { /* */ } return n; });

  const active = parts.find((p) => p.id === s.active) ?? null;
  const planned = active ? plannedMs(active) : null;
  const actual = active ? spentMs(s, active.id, now) : 0;
  const over = planned != null && actual > planned;
  const paused = s.pausedAt != null;
  const running = !!s.active && !paused;
  const clockTxt = active ? displayClock(loadMode(), planned, actual) : "--:--";

  const play = () => {
    if (s.active) update((x) => togglePause(x, Date.now()));
    else { const id = stepPart(parts, s, 1); if (id) update((x) => tapPart(x, id, Date.now())); }
  };
  const go = (dir: 1 | -1) => { const id = stepPart(parts, s, dir); if (id) update((x) => tapPart(x, id, Date.now())); };

  const btn = size === "l" ? "h-12 w-12" : size === "s" ? "h-8 w-8" : "h-10 w-10";
  const ico = size === "l" ? "h-6 w-6" : size === "s" ? "h-4 w-4" : "h-5 w-5";
  const label = t("meeting.title", { defaultValue: "Reunião" });

  return (
    <FloatingDock storageKey="meeting.minimizedPos" defaultPos={{ side: "right", y: 160 }} mode="grip"
      gripLabel={t("meeting.dragDock", { defaultValue: "Arrastar" })} className="rounded-2xl">
      <div className={cn("rounded-2xl border bg-background/95 shadow-lg backdrop-blur", size === "s" ? "px-2 py-1.5" : "px-3 py-2")}
        role="group" aria-label={label}>
        {size !== "s" && (
          <p className={cn("max-w-[14rem] truncate font-medium text-muted-foreground", size === "l" ? "text-sm" : "text-xs")}>
            {active ? active.theme : label}
          </p>
        )}
        <div className="flex items-center gap-1">
          {size === "s" && <Timer className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
          <button type="button" onClick={onOpen} aria-label={t("meeting.reopen", { defaultValue: "Voltar ao controle da reunião" })}
            className={cn("rounded-lg px-1 font-mono font-bold tabular-nums", over ? "text-destructive" : "text-foreground",
              size === "l" ? "text-3xl" : size === "s" ? "text-base" : "text-2xl")}>
            {clockTxt}
          </button>
          {size !== "s" && planned != null && (
            <span className="text-xs text-muted-foreground tabular-nums">/ {Math.round(planned / 60000)}:00</span>
          )}
          {size === "s" && (
            <button type="button" onClick={play} className={cn("grid place-items-center rounded-full text-primary", btn)}
              aria-label={running ? t("meeting.pause", { defaultValue: "Pausar" }) : t("meeting.start", { defaultValue: "Iniciar" })}>
              {running ? <Pause className={ico} /> : <Play className={ico} />}
            </button>
          )}
        </div>
        {size !== "s" && (
          <div className="mt-1 flex items-center justify-between gap-1">
            <button type="button" onClick={() => go(-1)} className={cn("grid place-items-center rounded-full hover:bg-muted", btn)} aria-label={t("meeting.prevPart", { defaultValue: "Parte anterior" })}><ChevronsLeft className={ico} /></button>
            <button type="button" onClick={play} className={cn("grid place-items-center rounded-full bg-primary text-primary-foreground", btn)}
              aria-label={running ? t("meeting.pause", { defaultValue: "Pausar" }) : t("meeting.start", { defaultValue: "Iniciar" })}>
              {running ? <Pause className={ico} /> : <Play className={ico} />}
            </button>
            <button type="button" onClick={() => go(1)} className={cn("grid place-items-center rounded-full hover:bg-muted", btn)} aria-label={t("meeting.nextPart", { defaultValue: "Próxima parte" })}><ChevronsRight className={ico} /></button>
            <button type="button" onClick={onOpen} className={cn("grid place-items-center rounded-full hover:bg-muted", btn)} aria-label={t("meeting.reopen", { defaultValue: "Voltar ao controle da reunião" })}><Maximize2 className={ico} /></button>
          </div>
        )}
        <button type="button" onClick={cycleSize} className="mt-0.5 w-full text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          aria-label={t("meeting.dockSize", { defaultValue: "Mudar tamanho" })}>
          {size === "s" ? "A" : size === "m" ? "A+" : "A++"}
        </button>
      </div>
    </FloatingDock>
  );
}
