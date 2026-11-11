// Controle de tempo do evento: tela cheia escura no estilo do programa.
// Cada parte tem seu temporizador; tocar em qualquer parte inicia a dela (encerra a anterior).
// Tudo fica no aparelho (event-timer.ts). Fora do app, a bolinha flutuante continua contando.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Bell, Calendar, CalendarClock, Check, ChevronLeft, ChevronRight, Clock, FileDown, Flag, Layers, MapPin, MoreHorizontal, Pencil, PlayCircle, Presentation, RotateCcw, Sun, Sunset, Timer as TimerIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatEventDate } from "@/lib/big-events/invite";
import { appConfirm, appPrompt } from "@/components/ui/app-dialogs";
import { useFocusChromeWhile } from "@/lib/focus-chrome";
import { useImmersiveWhile } from "@/lib/immersive";
import { acquireScreenWakeLock, releaseScreenWakeLock } from "@/lib/wake-lock";
import { saveBlob } from "@/lib/share";
import { safeFileName } from "@/lib/docx-export";
import {
  buildRows, clearTimer, clock, isFloating, loadTimer, plannedMs, programLabel, resetPart, saveTimer, setPartMinutes,
  signed, spentMs, stopAll, summarize, tapPart, toneFor, type TimerPart, type TimerState, type Tone,
  displayClock, fmtClockTime, fmtHm, loadMode, plannedStarts, saveMode, startDelayMin, type TimerMode,
} from "@/lib/big-events/event-timer";
import { hideFloating, isNativeAndroid, overlayGranted, requestOverlay, showFloating } from "@/lib/big-events/floating-timer";

const TONE_TEXT: Record<Tone, string> = { ok: "text-success", warn: "text-warning", over: "text-destructive", idle: "text-foreground" };
const TONE_BAR: Record<Tone, string> = { ok: "bg-success", warn: "bg-warning", over: "bg-destructive", idle: "bg-muted-foreground" };
const TONE_BOX: Record<Tone, string> = {
  ok: "bg-success text-success-foreground", warn: "bg-warning text-warning-foreground",
  over: "bg-destructive text-destructive-foreground", idle: "bg-muted text-muted-foreground",
};
const diffTone = (ms: number | null) => (ms == null || Math.abs(ms) < 30_000 ? "text-muted-foreground" : ms > 0 ? "text-destructive" : "text-success");
const OVERLAY_ASKED = "bigEventTimer.overlayAsked";

interface Props { ev: { id: string; name: string; event_date: string | null; location: string | null }; parts: TimerPart[]; onClose: () => void; speakerCong?: (p: TimerPart) => string | null; onEditPart?: (id: string) => void }

export function EventTimerFocus({ ev, parts, onClose, speakerCong, onEditPart }: Props) {
  const [s, setS] = useState<TimerState>(() => loadTimer(ev.id));
  const [now, setNow] = useState(() => Date.now());
  const [report, setReport] = useState(false);
  const [askOverlay, setAskOverlay] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);
  useFocusChromeWhile(true);
  useImmersiveWhile(true);

  const update = (fn: (x: TimerState) => TimerState) => setS((x) => { const n = fn(x); saveTimer(ev.id, n); return n; });
  // Grupos de partes sem orador: começam recolhidos (estado só nesta tela).
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  // Um toque inicia/para; dois toques perguntam se deseja zerar.
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const starts = useMemo(() => plannedStarts(parts), [parts]);
  const [mode, setModeState] = useState<TimerMode>(() => loadMode());
  const setMode = (m: TimerMode) => { setModeState(m); saveMode(m); };
  // Separadores Manhã/Tarde: só aparecem se o programa atravessa o meio-dia.
  const sectionFor = useMemo(() => {
    const mins = rows.map((r) => starts[r.part.id] ?? null);
    const hasPm = mins.some((m) => m != null && m >= 12 * 60), hasAm = mins.some((m) => m != null && m < 12 * 60);
    let firstPm = -1;
    if (hasAm && hasPm) firstPm = rows.findIndex((r, i) => r.kind !== "item" && (mins[i] ?? 0) >= 12 * 60);
    return (i: number): "Manhã" | "Tarde" | null => (firstPm < 0 ? null : i === 0 ? "Manhã" : i === firstPm ? "Tarde" : null);
  }, [rows, starts]);
  const progStart = useMemo(() => { const v = Object.values(starts).filter((x): x is number => x != null); return v.length ? Math.min(...v) : null; }, [starts]);
  const progEnd = useMemo(() => {
    let end: number | null = null;
    for (const r of rows) { if (r.kind === "item") continue; const st = starts[r.part.id]; if (st != null) end = Math.max(end ?? 0, st + (r.part.duration_min ?? 0)); }
    return end;
  }, [rows, starts]);
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
        plannedMs: loadMode() === "up" ? null : plannedMs(p), paused: cur.pausedAt != null,
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
  const zeroPart = async (p: TimerPart) => {
    if (!(await appConfirm({ title: "Zerar o tempo desta parte?", description: p.theme, confirmLabel: "Zerar", destructive: true }))) return;
    update((x) => resetPart(x, p.id, Date.now()));
  };
  const onClockTap = (p: TimerPart) => {
    if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; void zeroPart(p); return; }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; update((x) => tapPart(x, p.id, Date.now())); }, 280);
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
    <div className="dark fixed inset-0 z-50 flex flex-col bg-background text-foreground" role="dialog" aria-label="Controle de tempo">
      <header className="flex items-start gap-2 border-b border-border/60 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {report
          ? <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full" onClick={() => setReport(false)} aria-label="Voltar"><ChevronLeft className="h-5 w-5" /></Button>
          : <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full" onClick={close} aria-label="Fechar"><X className="h-5 w-5" /></Button>}
        <div className="min-w-0 flex-1 pt-1">
          {report && <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Relatório de tempo</p>}
          <p className="break-words text-[17px] font-semibold leading-snug">{ev.name || "Controle de tempo"}</p>
          {(ev.event_date || ev.location) && (
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {ev.event_date && <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{formatEventDate(ev.event_date)}</p>}
              {ev.location && <p className="flex items-start gap-1.5"><MapPin className="mt-px h-3.5 w-3.5 shrink-0" /><span className="break-words">{ev.location}</span></p>}
            </div>
          )}
          {progStart != null && <p className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"><Clock className="h-3.5 w-3.5 shrink-0" />{fmtHm(progStart)} – {fmtHm(progEnd)}</p>}
          <p className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums ${progTone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {report && !s.active ? programLabel(pd).replace("Programa", "Programa terminou") : programLabel(pd)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full" aria-label="Opções"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark min-w-[15rem]">
            <DropdownMenuItem onClick={() => setMode("down")}><Check className={`mr-2 h-4 w-4 ${mode === "down" ? "" : "opacity-0"}`} />Regressivo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("up")}><Check className={`mr-2 h-4 w-4 ${mode === "up" ? "" : "opacity-0"}`} />Cronômetro</DropdownMenuItem>
            <DropdownMenuSeparator />
            {!report && <DropdownMenuItem onClick={() => setReport(true)}><Layers className="mr-2 h-4 w-4" />Ver relatório</DropdownMenuItem>}
            <DropdownMenuItem onClick={exportPdf}><FileDown className="mr-2 h-4 w-4" />Exportar relatório executivo</DropdownMenuItem>
            {isNativeAndroid() && <DropdownMenuItem onClick={() => void requestOverlay()}><TimerIcon className="mr-2 h-4 w-4" />Permitir sobrepor a outros apps</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={restart}><RotateCcw className="mr-2 h-4 w-4" />Zerar todos os tempos</DropdownMenuItem>
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
        <div className="flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {!s.active && !s.done.length && <p className="px-4 pt-4 text-center text-xs text-muted-foreground">Toque no relógio de uma parte para iniciar o tempo dela.</p>}
          <ul className="space-y-2 px-3 py-3">
            {(() => {
              const out: unknown[] = [];
              const silent = (i: number) => { const r0 = rows[i]; return r0.kind === "part" && (r0.part.assigned_to === "none" || isFloating(r0.part)); };
              let i = 0;
              while (i < rows.length) {
                if (!silent(i)) { out.push(renderRow(i)); i++; continue; }
                let j = i;
                while (j + 1 < rows.length && silent(j + 1) && !sectionFor(j + 1)) j++;
                const ids = rows.slice(i, j + 1).map((x) => x.part.id);
                const gid = ids[0];
                const open = openGroups.has(gid) || ids.includes(s.active ?? "");
                const sec = sectionFor(i);
                if (sec) out.push(sectionLi(rows[i].part.id, sec));
                out.push(
                  <li key={`grp-${gid}`}>
                    <button type="button" aria-expanded={open}
                      onClick={() => setOpenGroups((g) => { const n = new Set(g); if (n.has(gid)) n.delete(gid); else n.add(gid); return n; })}
                      className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs text-muted-foreground active:bg-muted/40">
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                      <span className="min-w-0 flex-1 truncate">{rows.slice(i, j + 1).map((x) => x.part.theme).join(" · ")}</span>
                      <span className="shrink-0 tabular-nums">{fmtHm(starts[gid] ?? null)}{ids.length > 1 ? ` · ${ids.length}` : ""}</span>
                    </button>
                  </li>,
                );
                if (open) for (let k = i; k <= j; k++) out.push(renderRow(k, true));
                i = j + 1;
              }
              return out as ReactNode[];
            })()}
            {(s.active || s.done.length > 0) && (
              <li className="pt-4">
                <Button className="h-12 w-full gap-2 rounded-2xl text-[15px]" variant="secondary" onClick={() => void finish()}><Flag className="h-4 w-4" />Concluir evento</Button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>,
    document.body,
  );

  function sectionLi(id: string, section: "Manhã" | "Tarde") {
    return (
      <li key={`sec-${id}`} className="flex items-center gap-2 px-1 pb-0.5 pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {section === "Manhã" ? <Sun className="h-4 w-4 text-warning" /> : <Sunset className="h-4 w-4 text-warning" />}{section}
        <span className="h-px flex-1 bg-border/60" />
      </li>
    );
  }

  function renderRow(idx: number, inGroup = false) {
              const { part: p, kind, children } = rows[idx];
              const r = sum.parts[p.id];
              const isHeadGroup = kind === "head" && !!children?.length;
              const active = s.active === p.id;
              const planned = plannedMs(p);
              const actual = r?.actual ?? 0;
              const tone: Tone = active || r?.done || actual > 0 ? toneFor(planned, actual) : "idle";
              const done = !!r?.done;
              const muted = p.assigned_to === "none" || isFloating(p);
              const isItem = kind === "item";
              const who = p.assigned_to === "speaker" ? p.speaker_name : p.assigned_to === "co" ? "Superintendente de circuito" : p.assigned_to === "branch" ? "Representante da filial" : null;
              const cong = p.assigned_to === "speaker" ? speakerCong?.(p) : null;
              const pStart = starts[p.id] ?? null;
              const realStart = s.firstStart?.[p.id] ?? null;
              const delay = startDelayMin(pStart, ev.event_date, realStart, now);
              const section = inGroup ? null : sectionFor(idx);
              const sectionEl = section ? sectionLi(p.id, section) : null;
              if (isHeadGroup) {
                return [sectionEl, (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-warning/10 px-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning"><Presentation className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] font-semibold leading-snug text-warning">{p.theme}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {fmtHm(pStart)}{planned != null && <> · {Math.round(planned / 60_000)} min</>}
                        {r?.diff != null && <> · <span className={diffTone(r.diff)}>{signed(r.diff)}{r.done ? "" : " até agora"}</span></>}
                      </p>
                    </div>
                  </li>
                )];
              }
              const tap = () => onClockTap(p);
              return [sectionEl, (
                <li key={p.id} ref={active ? (activeRef as never) : undefined}
                  className={`overflow-hidden rounded-2xl transition-colors ${isItem ? "ml-3" : ""} ${active ? "bg-muted ring-1 ring-border" : "bg-muted/40"}`}>
                  <div className="flex items-stretch gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-[15px] font-medium leading-snug ${muted ? "text-muted-foreground" : isItem ? "text-warning" : "text-primary"} ${done && !active ? "opacity-70" : ""}`}>
                        {p.outline_number && !muted ? `${p.outline_number}. ` : ""}{isItem ? "• " : ""}{p.theme}
                        {planned != null && <span className="font-normal text-muted-foreground"> ({Math.round(planned / 60_000)} min)</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
                        <span className="inline-flex items-center gap-1" title="Horário do programa"><CalendarClock className="h-3.5 w-3.5" />{fmtHm(pStart)}</span>
                        <span className={`inline-flex items-center gap-1 ${realStart != null ? "text-foreground" : ""}`} title="Começou às"><PlayCircle className="h-3.5 w-3.5" />{realStart != null ? fmtClockTime(realStart) : "--:--"}</span>
                        {delay != null && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${delay > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}
                            title={realStart != null ? "Atraso no início" : "Atrasando o início"}>
                            <Bell className="h-3 w-3" />{delay > 0 ? `+${delay}` : delay < 0 ? `${delay}` : "no horário"}{delay !== 0 ? " min" : ""}
                          </span>
                        )}
                      </div>
                      {who && <p className="mt-1 truncate text-xs text-muted-foreground">{who}{cong ? ` · ${cong}` : ""}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button type="button" onClick={tap} aria-label={active ? "Encerrar esta parte" : "Iniciar esta parte"}
                        className={`flex h-[68px] w-[92px] flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 ${TONE_BOX[tone]} ${active && s.pausedAt != null ? "animate-pulse" : ""}`}>
                        <span className="font-mono text-[24px] font-semibold leading-none tabular-nums tracking-tight">{displayClock(mode, planned, actual)}</span>
                        <span className="mt-1 text-[11px] font-medium opacity-90">{planned != null ? `(${Math.round(planned / 60_000)}min)` : "(—)"}</span>
                      </button>
                      {(
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Opções da parte"><MoreHorizontal className="h-4 w-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark">
                            {onEditPart && <DropdownMenuItem onClick={() => onEditPart(p.id)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => void zeroPart(p)}><RotateCcw className="mr-2 h-4 w-4" />Reiniciar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void correct(p)}><TimerIcon className="mr-2 h-4 w-4" />Alterar tempo</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  {planned != null && (
                    <div className="h-1 bg-border/40">
                      <div className={`h-full transition-[width] duration-500 ${TONE_BAR[tone]}`} style={{ width: `${Math.min(100, (actual / planned) * 100)}%` }} />
                    </div>
                  )}
                </li>
              )];
  }
}
