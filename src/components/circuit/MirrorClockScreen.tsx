// Tela do aparelho espelho (celular, tablet ou TV na tribuna): o relógio é o protagonista.
// Paisagem: 1) tema + Ao vivo · 2) orador · congregação · 3) relógio · 4) término | próximo orador.
// Cada linha de texto fica numa linha só (a letra diminui até caber); em pé, o tema pode usar até 3 linhas.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Pause } from "lucide-react";
import { liveElapsed, mirrorClock, mirrorHeadline, mirrorTone, withCong, type MirrorSnap, type MirrorTone } from "@/lib/big-events/timer-mirror";

const TONE: Record<MirrorTone, string> = { ok: "text-success", warn: "text-warning", danger: "text-destructive", over: "text-destructive", idle: "text-foreground" };
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useViewport() {
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return vp;
}

/** Texto numa linha só: começa no tamanho máximo e diminui até caber na largura. */
function FitLine({ fit, max, min, className = "", children }: { fit: string; max: number; min: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || max <= 0) return;
    const fits = (px: number) => { el.style.fontSize = `${px}px`; return el.scrollWidth <= el.clientWidth + 1; };
    if (fits(max)) return;
    let lo = Math.min(min, max), hi = max;
    while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    el.style.fontSize = `${lo}px`;
  }, [fit, max, min]);
  return <p ref={ref} className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${className}`}>{children}</p>;
}

/** Relógio: ocupa o maior tamanho possível dentro do espaço livre, sem encostar nos textos. */
export function FitClock({ text, className }: { text: string; className: string }) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLParagraphElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const b = box.current;
    if (!b || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(b);
    return () => ro.disconnect();
  }, []);
  // Recalcula só quando muda a quantidade de dígitos (14:25 → +01:10), não a cada segundo.
  const shape = text.replace(/\d/g, "0");
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !size.w || !size.h) return;
    const fits = (px: number) => { el.style.fontSize = `${px}px`; return el.offsetWidth <= size.w * 0.96 && el.offsetHeight <= size.h; };
    let lo = 16, hi = Math.max(16, size.h);
    if (fits(hi)) return;
    while (hi - lo > 1) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    el.style.fontSize = `${lo}px`;
  }, [size.w, size.h, shape]);
  return (
    <div ref={box} className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
      <p ref={ref} className={`shrink-0 whitespace-nowrap font-mono font-semibold leading-none tracking-tight tabular-nums ${className}`} aria-live="off">{text}</p>
    </div>
  );
}

export function MirrorClockScreen({ snap, receivedAt, now, signal, hint }: { snap: MirrorSnap | null; receivedAt: number; now: number; signal: boolean; hint?: string | null }) {
  const { t } = useTranslation();
  const { w, h } = useViewport();
  const land = w > h;
  const pill = (cls: string, body: React.ReactNode) => (
    <span className={`inline-flex shrink-0 items-center gap-[0.4em] whitespace-nowrap rounded-full bg-muted/60 px-[0.8em] py-[0.25em] text-[clamp(11px,min(2.4vw,3.6vh),22px)] font-semibold ${cls}`}>{body}</span>
  );
  const noSignal = pill("text-muted-foreground", t("timerMirror.noSignal"));

  if (!snap) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-[6vw] text-center">
        <p className="text-[clamp(18px,min(5vw,7vh),44px)] font-semibold">{t("timerMirror.pageTitle")}</p>
        <p className="text-[clamp(14px,min(3.6vw,5vh),30px)] text-muted-foreground">{t("timerMirror.waiting")}</p>
        {hint && <p className="mt-2 font-mono text-[clamp(12px,min(3vw,4vh),22px)] text-muted-foreground/70">{hint}</p>}
      </div>
    );
  }
  const l = snap.live;
  if (!l) {
    return (
      <>
        <header className="flex justify-end px-[4vw] pt-[max(3vh,env(safe-area-inset-top))]">{signal ? pill("text-muted-foreground", t("timerMirror.live")) : noSignal}</header>
        <main className="flex flex-1 flex-col items-center justify-center px-[6vw] text-center">
          {snap.next ? (
            <>
              <p className="mb-[1.5vh] text-[clamp(14px,min(3.6vw,5vh),30px)] uppercase tracking-wide text-muted-foreground">{t("timerMirror.nextPart")}</p>
              <p className="line-clamp-3 text-[clamp(20px,min(6vw,8vh),60px)] font-semibold leading-tight">{snap.next.time} • {snap.next.title}</p>
            </>
          ) : <p className="line-clamp-3 text-[clamp(20px,min(6vw,8vh),60px)] font-semibold leading-tight">{snap.event}</p>}
        </main>
      </>
    );
  }

  const elapsed = liveElapsed(l, receivedAt, now);
  const tone = mirrorTone(l.plannedMs, elapsed);
  const text = mirrorClock(snap.mode, l.plannedMs, elapsed);
  const head = mirrorHeadline(l, (i, n) => t("timerMirror.partOf", { i, n }));
  const who = withCong(l.speaker, l.speakerCong);
  const next = withCong(l.nextSpeaker, l.nextCong);
  // Tamanhos máximos das linhas (px), a partir da tela; FitLine diminui se o texto for longo.
  const px = (vw: number, vh: number, cap: number) => Math.min(w * vw, h * vh, cap);
  const sz = land
    ? { head: px(0.03, 0.062, 40), who: px(0.034, 0.072, 44), foot: px(0.028, 0.058, 36) }
    : { head: px(0.04, 0.024, 30), who: px(0.05, 0.03, 38), foot: px(0.042, 0.026, 30) };
  const status = !signal ? noSignal : l.paused
    ? pill("text-warning", <><Pause className="h-[1em] w-[1em]" />{t("timerMirror.paused")}</>)
    : pill("text-success", <><span className="h-[0.55em] w-[0.55em] animate-pulse rounded-full bg-current" />{t("timerMirror.live")}</>);
  const endEl = l.endLabel ? <>{t("timerMirror.end")} <b className="font-semibold text-foreground tabular-nums">{l.endLabel}</b></> : null;
  const nextEl = next ? <>{t("timerMirror.nextSpeaker")} <b className="font-semibold text-foreground">{next}</b></> : null;

  return (
    <div className={`flex min-h-0 flex-1 flex-col px-[max(4vw,env(safe-area-inset-left))] ${land ? "pb-[max(2.5vh,env(safe-area-inset-bottom))] pt-[max(2.5vh,env(safe-area-inset-top))]" : "pb-[max(3vh,env(safe-area-inset-bottom))] pt-[max(3vh,env(safe-area-inset-top))]"}`}>
      {/* Linha 1: tema + Ao vivo */}
      <header className={`flex gap-[3vw] ${land ? "items-center" : "items-start"}`}>
        {land
          ? <FitLine fit={`${head}|${w}|${h}`} max={sz.head} min={11} className="flex-1 font-semibold uppercase tracking-wide text-muted-foreground">{head}</FitLine>
          : <p className="line-clamp-3 min-w-0 flex-1 font-semibold uppercase leading-snug tracking-wide text-muted-foreground" style={{ fontSize: Math.max(13, sz.head) }}>{head}</p>}
        {status}
      </header>
      {/* Linha 2: orador · congregação */}
      {who && <FitLine fit={`${who}|${w}|${h}`} max={sz.who} min={12} className="mt-[1vh] font-medium text-foreground">{who}</FitLine>}

      {/* Linha 3: relógio (protagonista) */}
      <main className={`flex min-h-0 flex-1 flex-col items-center justify-center ${land ? "py-[1.5vh]" : "py-[3vh]"}`}>
        {tone === "over" && (
          <p className="mb-[1.5vh] flex shrink-0 items-center gap-[0.4em] rounded-full border-2 border-destructive bg-destructive/15 px-[1em] py-[0.3em] text-[clamp(15px,min(5vw,6.5vh),52px)] font-extrabold uppercase text-destructive">
            <AlertTriangle className="h-[1em] w-[1em]" />{t("timerMirror.over")}
          </p>
        )}
        <FitClock text={text} className={TONE[tone]} />
      </main>

      {/* Linha 4: término | próximo orador */}
      {(endEl || nextEl) && (
        <footer className="border-t border-border pt-[1.6vh] text-muted-foreground">
          {land ? (
            <FitLine fit={`${l.endLabel}|${next}|${w}|${h}`} max={sz.foot} min={11}>
              {endEl}{endEl && nextEl && <span className="px-[0.7em] text-border">|</span>}{nextEl}
            </FitLine>
          ) : (
            <div className="space-y-[0.6vh]">
              {endEl && <p className="whitespace-nowrap" style={{ fontSize: Math.max(13, sz.foot) }}>{endEl}</p>}
              {nextEl && <p className="line-clamp-2 leading-snug" style={{ fontSize: Math.max(13, sz.foot) }}>{nextEl}</p>}
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
