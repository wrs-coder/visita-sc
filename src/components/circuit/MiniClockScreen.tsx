// Mini tempo do orador: o mesmo relógio do púlpito, só da parte desse orador,
// com a opção de flutuar por cima do esboço (JW Library, PDF…).
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PictureInPicture2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { liveElapsed, miniView, mirrorClock, mirrorTone, type MirrorSnap, type MirrorTone } from "@/lib/big-events/timer-mirror";
import { FLOAT_SIZES, createFloatClock, floatSupported, loadFloatSize, saveFloatSize, type FloatClock, type FloatSize } from "@/lib/big-events/float-clock";
import { darkTokenColors } from "@/lib/big-events/timer-mirror-page";
import { FitClock } from "./MirrorClockScreen";

const TONE: Record<MirrorTone, string> = { ok: "text-success", warn: "text-warning", danger: "text-destructive", over: "text-destructive", idle: "text-foreground" };

export function MiniClockScreen({ snap, receivedAt, now, signal, part }: { snap: MirrorSnap | null; receivedAt: number; now: number; signal: boolean; part: string }) {
  const { t } = useTranslation();
  const v = miniView(snap, part);
  const state = useRef({ snap, receivedAt, part });
  state.current = { snap, receivedAt, part };
  const [can, setCan] = useState(false);
  const floatRef = useRef<FloatClock | null>(null);
  const [size, setSize] = useState<FloatSize>("small");
  useEffect(() => { setSize(loadFloatSize()); }, []);

  useEffect(() => {
    setCan(floatSupported());
    const c = darkTokenColors();
    floatRef.current = createFloatClock(() => {
      const { snap: sn, receivedAt: at, part: p } = state.current;
      const mv = miniView(sn, p);
      if (mv.kind === "live") {
        const el = liveElapsed(mv.live, at, Date.now());
        const tn = mirrorTone(mv.live.plannedMs, el);
        const color = tn === "ok" ? c.ok : tn === "warn" ? c.warn : tn === "idle" ? c.fg : c.danger;
        return { text: mirrorClock(sn!.mode, mv.live.plannedMs, el), color, bg: c.bg, blink: tn === "over" };
      }
      if (mv.kind === "before") return { text: mv.at || "--:--", color: c.muted, bg: c.bg };
      if (mv.kind === "done") return { text: "✓", color: c.ok, bg: c.bg };
      return { text: "--:--", color: c.muted, bg: c.bg };
    }, size);
    return () => { floatRef.current?.destroy(); floatRef.current = null; };
  }, [size]);
  const pick = (v: FloatSize) => { setSize(v); saveFloatSize(v); };

  const float = async () => {
    const ok = await floatRef.current?.open();
    if (!ok) toast(t("timerMirror.floatFailed"));
  };

  const pill = (cls: string, body: React.ReactNode) => (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold ${cls}`}>{body}</span>
  );
  let body: React.ReactNode;
  let theme = "";
  if (v.kind === "live") {
    const el = liveElapsed(v.live, receivedAt, now);
    const tn = mirrorTone(v.live.plannedMs, el);
    theme = v.live.item || v.live.title;
    body = (
      <>
        {tn === "over" && <p className="mb-[1.5vh] rounded-full border-2 border-destructive px-4 py-1 text-[clamp(13px,4vw,28px)] font-extrabold uppercase text-destructive">{t("timerMirror.over")}</p>}
        <FitClock text={mirrorClock(snap!.mode, v.live.plannedMs, el)} className={TONE[tn]} />
      </>
    );
  } else if (v.kind === "before") {
    theme = v.theme;
    body = (
      <div className="m-auto text-center">
        <p className="text-[clamp(14px,4vw,26px)] text-muted-foreground">{t("timerMirror.miniStarts")}</p>
        <p className="mt-1 font-mono text-[clamp(48px,min(22vw,30vh),160px)] font-semibold leading-none tabular-nums">{v.at || "--:--"}</p>
      </div>
    );
  } else if (v.kind === "done") {
    theme = v.theme;
    body = <p className="m-auto px-6 text-center text-[clamp(18px,5vw,36px)] font-semibold text-success">{t("timerMirror.miniDone")}</p>;
  } else {
    body = <p className="m-auto px-6 text-center text-[clamp(14px,4vw,26px)] text-muted-foreground">{t("timerMirror.waiting")}</p>;
  }

  return (
    <div className="flex flex-1 flex-col px-[5vw] pb-[max(3vh,env(safe-area-inset-bottom))] pt-[max(3vh,env(safe-area-inset-top))]">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("timerMirror.miniTitle")}</p>
          {theme && <p className="mt-0.5 line-clamp-2 text-[clamp(14px,3.8vw,24px)] font-semibold leading-snug">{theme}</p>}
        </div>
        {v.kind === "live" && (signal
          ? (v.live.paused ? pill("text-warning", t("timerMirror.paused")) : pill("text-success", <><span className="h-1.5 w-1.5 rounded-full bg-current" />{t("timerMirror.live")}</>))
          : pill("text-muted-foreground", t("timerMirror.noSignal")))}
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center py-[2vh]">{body}</main>
      {can && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("timerMirror.floatSize")}</p>
          <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1 text-sm font-medium">
            {FLOAT_SIZES.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={size === k} onClick={() => pick(k)}
                className={`rounded-full py-2 transition-colors ${size === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {t(`timerMirror.size_${k}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      {can && (
        <Button className="h-12 w-full gap-2 rounded-2xl text-[15px]" onClick={() => void float()}>
          <PictureInPicture2 className="h-5 w-5" />{t("timerMirror.float")}
        </Button>
      )}
      {can && <p className="mt-2 text-center text-xs text-muted-foreground">{t("timerMirror.floatHint")}</p>}
    </div>
  );
}
