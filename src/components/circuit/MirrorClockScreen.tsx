// Tela do tablet/TV (púlpito ou mesa de som): só o relógio da parte em andamento.
import { useTranslation } from "react-i18next";
import { AlertTriangle, Pause } from "lucide-react";
import { liveElapsed, mirrorClock, mirrorTone, type MirrorSnap, type MirrorTone } from "@/lib/big-events/timer-mirror";

const TONE: Record<MirrorTone, string> = { ok: "text-success", warn: "text-warning", danger: "text-destructive", over: "text-destructive", idle: "text-foreground" };

export function MirrorClockScreen({ snap, receivedAt, now, signal, hint }: { snap: MirrorSnap | null; receivedAt: number; now: number; signal: boolean; hint?: string | null }) {
  const { t } = useTranslation();
  const pill = (cls: string, body: React.ReactNode) => (
    <span className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border px-[1.6vw] py-[0.6vh] text-[clamp(13px,2vw,26px)] font-semibold ${cls}`}>{body}</span>
  );
  const noSignal = pill("text-muted-foreground", t("timerMirror.noSignal"));

  if (!snap) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-[5vw] text-center">
        <p className="text-[clamp(18px,3.4vw,44px)] font-semibold">{t("timerMirror.pageTitle")}</p>
        <p className="text-[clamp(14px,2.4vw,30px)] text-muted-foreground">{t("timerMirror.waiting")}</p>
        {hint && <p className="mt-2 font-mono text-[clamp(12px,1.8vw,22px)] text-muted-foreground">{hint}</p>}
      </div>
    );
  }
  const l = snap.live;
  if (!l) {
    return (
      <>
        <header className="flex justify-end px-[3vw] pt-[3vh]">{signal ? pill("text-muted-foreground", t("timerMirror.live")) : noSignal}</header>
        <main className="flex flex-1 flex-col items-center justify-center px-[5vw] text-center">
          {snap.next ? (
            <>
              <p className="mb-[1.5vh] text-[clamp(14px,2.4vw,30px)] uppercase tracking-wide text-muted-foreground">{t("timerMirror.nextPart")}</p>
              <p className="text-[clamp(20px,4.5vw,60px)] font-semibold leading-tight">{snap.next.time} • {snap.next.title}</p>
            </>
          ) : <p className="text-[clamp(20px,4.5vw,60px)] font-semibold leading-tight">{snap.event}</p>}
        </main>
      </>
    );
  }
  const elapsed = liveElapsed(l, receivedAt, now);
  const tone = mirrorTone(l.plannedMs, elapsed);
  const text = mirrorClock(snap.mode, l.plannedMs, elapsed);
  const head = [l.label, l.title].filter(Boolean).join(" • ") + (l.minutes != null ? ` (${l.minutes} min)` : "") + (l.pos ? ` (${t("timerMirror.partOf", { i: l.pos.i, n: l.pos.n })})` : "");
  return (
    <>
      <header className="flex items-start justify-between gap-[3vw] px-[3vw] pt-[max(3vh,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="break-words text-[clamp(14px,2.6vw,34px)] font-semibold uppercase leading-snug tracking-wide text-muted-foreground">{head}</p>
          {l.item && <p className="mt-[0.4vh] break-words text-[clamp(14px,2.4vw,30px)] text-muted-foreground">• {l.item}</p>}
          {l.speaker && <p className="mt-[0.6vh] break-words text-[clamp(16px,3vw,40px)] font-medium">{t("timerMirror.speaker")} {l.speaker}</p>}
        </div>
        {!signal ? noSignal : l.paused
          ? pill("text-warning", <><Pause className="h-[1em] w-[1em]" />{t("timerMirror.paused")}</>)
          : pill("text-success", <><span className="h-[0.6em] w-[0.6em] animate-pulse rounded-full bg-current" />{t("timerMirror.live")}</>)}
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center">
        {tone === "over" && (
          <p className="mb-[3vh] flex items-center gap-[1vw] rounded-3xl border-[3px] border-destructive bg-destructive/15 px-[4vw] py-[1.5vh] text-[clamp(20px,4.5vw,64px)] font-extrabold uppercase text-destructive">
            <AlertTriangle className="h-[1em] w-[1em]" />{t("timerMirror.over")}
          </p>
        )}
        <p className={`font-mono font-semibold leading-none tracking-tight tabular-nums ${TONE[tone]} whitespace-nowrap ${text.length > 6 ? "text-[min(17vw,32vh)]" : text.length > 5 || tone === "over" ? "text-[min(24vw,40vh)]" : "text-[min(30vw,52vh)]"}`} aria-live="off">{text}</p>
      </main>
      {(l.endLabel || l.nextSpeaker) && (
        <footer className="flex items-center justify-between gap-[3vw] border-t-2 border-border px-[3vw] pb-[max(2.5vh,env(safe-area-inset-bottom))] pt-[2.5vh] text-[clamp(16px,2.8vw,40px)] text-muted-foreground">
          <span>{l.endLabel && <>{t("timerMirror.end")} <b className="text-foreground tabular-nums">{l.endLabel}</b></>}</span>
          <span className="text-right">{l.nextSpeaker && <>{t("timerMirror.nextSpeaker")} <b className="text-foreground">{l.nextSpeaker}</b></>}</span>
        </footer>
      )}
    </>
  );
}
