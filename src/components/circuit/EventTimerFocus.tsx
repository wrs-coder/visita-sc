// Controle de tempo do evento: tela cheia escura no estilo do programa.
// Cada parte tem seu temporizador; tocar em qualquer parte inicia a dela (encerra a anterior).
// Tudo fica no aparelho (event-timer.ts). Fora do app, a bolinha flutuante continua contando.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ChevronLeft, FileDown, Layers, MoreHorizontal, Pause, Play, RotateCcw, Square, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { appConfirm, appPrompt } from "@/components/ui/app-dialogs";
import { useFocusChromeWhile } from "@/lib/focus-chrome";
import { useImmersiveWhile } from "@/lib/immersive";
import { acquireScreenWakeLock, releaseScreenWakeLock } from "@/lib/wake-lock";
import { saveBlob } from "@/lib/share";
import { safeFileName } from "@/lib/docx-export";
import {
  buildRows, clearTimer, clock, isFloating, loadTimer, plannedMs, programLabel, resetPart, saveTimer, setPartMinutes,
  signed, spentMs, stopAll, summarize, tapPart, togglePause, toneFor, type TimerPart, type TimerState, type Tone,
} from "@/lib/big-events/event-timer";
import { hideFloating, isNativeAndroid, overlayGranted, requestOverlay, showFloating } from "@/lib/big-events/floating-timer";

const TONE_TEXT: Record<Tone, string> = { ok: "text-success", warn: "text-warning", over: "text-destructive", idle: "text-foreground" };
const TONE_BAR: Record<Tone, string> = { ok: "bg-success", warn: "bg-warning", over: "bg-destructive", idle: "bg-muted-foreground" };
const diffTone = (ms: number | null) => (ms == null || Math.abs(ms) < 30_000 ? "text-muted-foreground" : ms > 0 ? "text-destructive" : "text-success");
const OVERLAY_ASKED = "bigEventTimer.overlayAsked";

interface Props { ev: { id: string; name: string; event_date: string | null; location: string | null }; parts: TimerPart[]; onClose: () => void }

export function EventTimerFocus({ ev, parts, onClose }: Props) {
  const [s, setS] = useState<TimerState>(() => loadTimer(ev.id));
  const [now, setNow] = useState(() => Date.now());
  const [report, setReport] = useState(false);
  const [askOverlay, setAskOverlay] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);
  useFocusChromeWhile(true);
  useImmersiveWhile(true);

  const update = (fn: (x: TimerState) => TimerState) => setS((x) => { const n = fn(x); saveTimer(ev.id, n); return n; });
  const running = !!s.active && s.pausedAt == null;
  useEffect(() => {
    if (!s.active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [s.active]);
  useEffect(() => {
    if (!s.active) return;
    void acquireScreenWakeLock();
    return () => { void releaseScreenWakeLock(); };
  }, [s.active]);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [s.active]);
  useEffect(() => {
    if (!isNativeAndroid()) return;
    void overlayGranted().then((g) => { try { if (!g && !localStorage.getItem(OVERLAY_ASKED)) setAskOverlay(true); } catch { /* */ } });
  }, []);

  const rows = useMemo(() => buildRows(parts), [parts]);
  const sum = useMemo(() => summarize(parts, s, now), [parts, s, now]);
  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);

  // Fora do app: bolinha flutuante (ou notificação fixa) com a parte atual.
  const sRef = useRef(s); sRef.current = s;
  useEffect(() => {
    let off: (() => void) | undefined;
    const apply = (bg: boolean) => {
      const cur = sRef.current, p = cur.active ? byId.get(cur.active) : null;
      if (!bg || !p || cur.startedAt == null) { void hideFloating(); return; }
      const t = Date.now();
      void showFloating({
        title: [p.outline_number ? `Disc. ${p.outline_number}` : null, p.theme].filter(Boolean).join(" · "),
        program: programLabel(summarize(parts, cur, t).programDiff).replace("Programa ", "").replace("no horário", "em dia"),
        startedAt: cur.startedAt, spentMs: cur.pausedAt != null ? spentMs(cur, p.id, t) : cur.spent[p.id] ?? 0,
        plannedMs: plannedMs(p), paused: cur.pausedAt != null,
      });
    };
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", ({ isActive }) => apply(!isActive)))
      .then((h) => { off = () => void h.remove(); }).catch(() => { /* web */ });
    return () => { off?.(); void hideFloating(); };
  }, [byId, parts]);

  const close = () => { onClose(); };
  const finish = async () => {
    update((x) => stopAll(x, Date.now()));
    setReport(true);
  };
  const restart = async () => {
    if (!(await appConfirm({ title: "Zerar o controle de tempo?", description: "Todos os tempos registrados deste evento serão apagados deste aparelho.", confirmLabel: "Zerar", destructive: true }))) return;
    clearTimer(ev.id); setS(loadTimer(ev.id)); setReport(false);
  };
  const correct = async (p: TimerPart) => {
    const cur = Math.round(spentMs(s, p.id, Date.now()) / 6000) / 10;
    const v = await appPrompt("Tempo real (minutos)", String(cur).replace(".", ","), { placeholder: "Ex.: 12,5" });
    if (v == null) return;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) { toast.error("Informe os minutos, por exemplo 12,5"); return; }
    update((x) => setPartMinutes(x, p.id, n));
  };
  const exportPdf = async () => {
    try {
      const bytes = await (await import("@/lib/big-events/timer-report-pdf")).timerReportPdf(ev, parts, summarize(parts, s, Date.now()));
      await saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), { filename: `${safeFileName(`Relatório de tempo ${ev.name}`, "relatorio")}.pdf`, mimeType: "application/pdf" });
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
  };

  const pd = sum.programDiff;
  const progTone = Math.abs(pd) < 60_000 ? "text-muted-foreground" : pd > 0 ? "text-warning" : "text-success";

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="dark fixed inset-0 z-[60] flex flex-col bg-background text-foreground" role="dialog" aria-label="Controle de tempo">
      <header className="flex items-center gap-2 border-b border-border/60 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {report
          ? <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setReport(false)} aria-label="Voltar"><ChevronLeft className="h-5 w-5" /></Button>
          : <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={close} aria-label="Fechar"><X className="h-5 w-5" /></Button>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{report ? "Relatório de tempo" : "Controle de tempo"}</p>
          <p className={`text-xs font-medium tabular-nums ${progTone}`}>{report && !s.active ? programLabel(pd).replace("Programa", "Programa terminou") : programLabel(pd)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Opções"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark">
            {!report && <DropdownMenuItem onClick={() => setReport(true)}><Layers className="mr-2 h-4 w-4" />Ver relatório</DropdownMenuItem>}
            <DropdownMenuItem onClick={exportPdf}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</DropdownMenuItem>
            {isNativeAndroid() && <DropdownMenuItem onClick={() => void requestOverlay()}><Timer className="mr-2 h-4 w-4" />Permitir sobrepor a outros apps</DropdownMenuItem>}
            <DropdownMenuItem className="text-destructive" onClick={restart}><RotateCcw className="mr-2 h-4 w-4" />Zerar tempos</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {askOverlay && !report && (
        <div className="mx-3 mt-3 rounded-2xl bg-muted/60 p-3 text-sm">
          <p className="font-medium">Continuar vendo o tempo fora do app?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Permita "Sobrepor a outros apps" para uma bolinha com o cronômetro aparecer por cima dos outros apps.</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { try { localStorage.setItem(OVERLAY_ASKED, "1"); } catch { /* */ } setAskOverlay(false); }}>Agora não</Button>
            <Button size="sm" onClick={() => { try { localStorage.setItem(OVERLAY_ASKED, "1"); } catch { /* */ } setAskOverlay(false); void requestOverlay(); }}>Permitir</Button>
          </div>
        </div>
      )}

      {report ? (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Parte</span><span className="text-right">Prev.</span><span className="text-right">Real</span><span className="text-right">Dif.</span>
          </div>
          <ul className="mt-1 divide-y divide-border/50">
            {rows.map(({ part: p, kind }) => {
              const r = sum.parts[p.id];
              if (!r || (!r.done && r.actual === 0)) return null;
              return (
                <li key={p.id} className={`grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 py-2 text-sm tabular-nums ${kind === "item" ? "pl-4" : ""}`}>
                  <span className={`min-w-0 break-words ${kind === "head" ? "font-semibold" : ""}`}>
                    {kind === "item" ? "• " : ""}{p.outline_number ? `${p.outline_number}. ` : ""}{p.theme}
                    {p.speaker_name && <span className="block text-xs text-muted-foreground">{p.speaker_name}</span>}
                  </span>
                  <span className="text-right text-muted-foreground">{r.planned != null ? clock(r.planned) : "—"}</span>
                  <span className="text-right">{clock(r.actual)}</span>
                  <span className={`text-right font-medium ${diffTone(r.diff)}`}>{r.diff != null ? signed(r.diff) : "—"}</span>
                </li>
              );
            })}
          </ul>
          {sum.bySpeaker.length > 0 && (
            <>
              <p className="mt-6 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Por ancião</p>
              <ul className="mt-1 divide-y divide-border/50 rounded-2xl bg-muted/40 px-3">
                {sum.bySpeaker.map((b) => (
                  <li key={b.name} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="min-w-0 truncate">{b.name}{b.parts > 1 && <span className="text-xs text-muted-foreground"> · {b.parts} partes</span>}</span>
                    <span className={`font-medium tabular-nums ${diffTone(b.diff)}`}>{signed(b.diff)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!Object.values(sum.parts).some((r) => r.done || r.actual > 0) && <p className="mt-10 text-center text-sm text-muted-foreground">Nenhum tempo registrado ainda.</p>}
          <Button className="mt-6 w-full gap-2 rounded-full" onClick={exportPdf}><FileDown className="h-4 w-4" />Exportar PDF</Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-28">
          {!s.active && !s.done.length && <p className="px-4 pt-4 text-center text-xs text-muted-foreground">Toque em uma parte para iniciar o tempo dela.</p>}
          <ul className="px-2 py-2">
            {rows.map(({ part: p, kind, children }) => {
              const r = sum.parts[p.id];
              const isHeadGroup = kind === "head" && !!children?.length;
              const active = s.active === p.id;
              const planned = plannedMs(p);
              const actual = r?.actual ?? 0;
              const tone = toneFor(planned, actual);
              const done = !!r?.done;
              const muted = p.assigned_to === "none" || isFloating(p);
              const who = p.assigned_to === "speaker" ? p.speaker_name : p.assigned_to === "co" ? "Superintendente de circuito" : p.assigned_to === "branch" ? "Representante da filial" : null;
              const body = (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className={`w-11 shrink-0 text-xs tabular-nums text-muted-foreground`}>{kind === "item" ? "" : p.part_time ?? ""}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-[15px] leading-snug ${muted ? "text-muted-foreground" : isHeadGroup ? "font-semibold" : "font-medium"} ${done && !active ? "opacity-60" : ""}`}>
                        {kind === "item" && <span className="text-muted-foreground">• </span>}
                        {p.outline_number && !muted ? <span className="text-muted-foreground">{p.outline_number}. </span> : null}{p.theme}
                      </p>
                      {who && <p className={`text-xs text-muted-foreground ${done && !active ? "opacity-60" : ""}`}>{who}</p>}
                      {!active && (
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {isHeadGroup
                            ? <>{planned != null ? clock(planned) : "—"}{r?.diff != null && <> · <span className={diffTone(r.diff)}>{signed(r.diff)}{r.done ? "" : " até agora"}</span></>}</>
                            : done
                              ? <>✓ {clock(actual)}{r?.diff != null && <> · <span className={diffTone(r.diff)}>{signed(r.diff)}</span></>}</>
                              : planned != null ? clock(planned) : null}
                        </p>
                      )}
                    </div>
                    {done && !active && !isHeadGroup && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" onClick={(e) => e.stopPropagation()} className="-mr-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Opções da parte"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="dark" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => update((x) => resetPart(x, p.id, Date.now()))}><RotateCcw className="mr-2 h-4 w-4" />Refazer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void correct(p)}><Timer className="mr-2 h-4 w-4" />Corrigir tempo</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {active && (
                    <div className="mt-2 pl-14">
                      <div className="flex items-center gap-3">
                        <span className={`text-4xl font-semibold tabular-nums tracking-tight ${TONE_TEXT[tone]}`}>
                          {planned != null ? (planned - actual < 0 ? `+${clock(actual - planned)}` : clock(planned - actual)) : clock(actual)}
                        </span>
                        <span className="text-xs text-muted-foreground">{planned == null ? "decorrido" : planned - actual < 0 ? "passou" : "restantes"}{s.pausedAt != null ? " · pausado" : ""}</span>
                      </div>
                      {planned != null && (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full transition-[width] duration-500 ${TONE_BAR[tone]}`} style={{ width: `${Math.min(100, (actual / planned) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
              return (
                <li key={p.id} ref={active ? (activeRef as never) : undefined} className={kind === "item" ? "pl-4" : ""}>
                  {isHeadGroup
                    ? <div className="px-3 pb-1 pt-4">{body}</div>
                    : (
                      <div role="button" tabIndex={0} onClick={() => update((x) => tapPart(x, p.id, Date.now()))}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); update((x) => tapPart(x, p.id, Date.now())); } }}
                        className={`my-0.5 cursor-pointer select-none rounded-2xl px-3 py-2.5 transition-colors active:scale-[0.99] ${active ? "bg-muted ring-1 ring-border" : "hover:bg-muted/50"}`}>
                        {body}
                      </div>
                    )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!report && (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
          {s.active && (
            <Button variant="secondary" className="pointer-events-auto h-12 gap-2 rounded-full px-5" onClick={() => update((x) => togglePause(x, Date.now()))}>
              {running ? <><Pause className="h-4 w-4" />Pausar</> : <><Play className="h-4 w-4" />Continuar</>}
            </Button>
          )}
          {(s.active || s.done.length > 0) && (
            <Button variant="secondary" className="pointer-events-auto h-12 gap-2 rounded-full px-5" onClick={finish}><Square className="h-4 w-4" />Encerrar</Button>
          )}
        </footer>
      )}
    </div>,
    document.body,
  );
}
