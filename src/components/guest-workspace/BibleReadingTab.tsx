// Aba "Leitura da Bíblia": meta, progresso, capítulos, pontos altos e leitura limpa.
import { consumeReaderReturn, setReaderReturn, verseFromRef } from "@/lib/reader-return";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Sparkles, Play, Settings2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BibleManagerDialog } from "@/components/bible/BibleManagerDialog";
import { getLocalizedBookName } from "@/lib/bible-canon";
import { ALL_BOOKS, bookOrder, chapterSequence, chaptersOf, customPlanDay, yearPlanDay, TOTAL_CHAPTERS, type CustomPlan, type ReadingPlan } from "@/lib/bible-chapters";
import type { WsData } from "@/lib/guest-workspace-store";
import { cn } from "@/lib/utils";
import { HighlightsDrawer } from "./HighlightsDrawer";
import { CleanReader } from "./CleanReader";
import { JwLibraryPanel } from "./JwLibraryPanel";
import { CollapsibleSection } from "./CollapsibleSection";
import { TrackPills, WeekdayCard, MeetingWeekCard, CommentCard, CommentMode, newWeekday, useDayNames } from "./BibleTrackExtras";
import { commentList, filterByTrack, meetingWeekKeys, weekdayAdvance, weekdayNextUnread, weekdayProgress, type Track } from "@/lib/bible-tracks";
import type { WsReading } from "@/lib/guest-workspace-store";
import { creditDayFor, creditPlan, lateWeekdays, markReadToday, planEdited, seedPlan, weekdayLog, weekdayPending } from "@/lib/reading-day-log";
import { abbreviateBookAlways } from "@/lib/book-abbrev";
import { useChapterSpan } from "./use-chapter-span";

const TRACK_KEY = "guest.workspace.track";
const freshReading = (): WsReading => ({ plan: "canon", startDate: new Date().toISOString().slice(0, 10), done: [] });
const getReading = (d: WsData, tr: Track): WsReading => tr === "personal" ? d.reading : d.readings?.[tr] ?? freshReading();
const putReading = (d: WsData, tr: Track, r: WsReading): WsData => tr === "personal" ? { ...d, reading: r } : { ...d, readings: { ...d.readings, [tr]: r } };

const BOOKS_OPEN_KEY = "guest.workspace.booksOpen";

export function BibleReadingTab({ data, update, notes, onNote }: { data: WsData; update: (fn: (d: WsData) => WsData) => void; notes: ReactNode; onNote: (ref: string, text: string) => void }) {
  const { t, i18n } = useTranslation();
  const [track, setTrackState] = useState<Track>("personal");
  useEffect(() => { try { const v = localStorage.getItem(TRACK_KEY); if (v === "family" || v === "meeting") setTrackState(v); } catch { /* */ } }, []);
  const setTrack = (v: Track) => { setTrackState(v); try { localStorage.setItem(TRACK_KEY, v); } catch { /* */ } };
  const rdata = getReading(data, track);
  const wdOn = !!rdata.weekday?.enabled;
  const { plan, done: doneList, startDate } = rdata;
  const [readingDay, setReadingDay] = useState<number | null>(null);
  const [hlFilter, setHlFilter] = useState<Track | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const meetingKeys = track === "meeting" ? meetingWeekKeys(rdata.meetingWeek, new Date()) : [];
  const toComment = commentList(data.highlights, new Date());
  const done = useMemo(() => new Set(doneList), [doneList]);
  const [openBooks, setOpenBooks] = useState<Set<string>>(new Set());
  const [listOpen, setListOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(BOOKS_OPEN_KEY) === "1") setListOpen(true); } catch { /* */ } }, []);
  const toggleList = () => { const n = !listOpen; setListOpen(n); try { localStorage.setItem(BOOKS_OPEN_KEY, n ? "1" : "0"); } catch { /* */ } };
  const custom: CustomPlan = rdata.custom ?? { books: ALL_BOOKS, perDay: null, endDate: null };
  const [reading, setReading] = useState<string | null>(null);
  const [jumpVerse, setJumpVerse] = useState<number | null>(null);
  // Ao voltar de uma anotação criada no leitor, reabre o mesmo capítulo.
  useEffect(() => {
    const r = consumeReaderReturn(); if (!r) return;
    if (r.track === "personal" || r.track === "family" || r.track === "meeting") setTrackState(r.track);
    setReadingDay(r.readingDay); setJumpVerse(r.verse); setReading(r.chapterKey);
  }, []);
  const [pick, setPick] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();
  const [bibleOpen, setBibleOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"notes" | "highlights" | "jw">("notes");

    const seq = chapterSequence(plan, custom);
  const total = plan === "custom" ? seq.length : TOTAL_CHAPTERS;
  const doneIn = plan === "custom" ? seq.filter((k) => done.has(k)).length : done.size;
  const wdp = wdOn ? weekdayProgress(rdata.weekday!, done, TOTAL_CHAPTERS) : null;
  const percent = wdp ? wdp.percent : total ? Math.round((doneIn / total) * 100) : 0;
  const next = wdOn ? weekdayNextUnread(rdata.weekday!, new Date().getDay(), done) : seq.find((k) => !done.has(k)) ?? null;
  const today = plan === "year" ? yearPlanDay(startDate, new Date()) : plan === "custom" ? customPlanDay(custom, startDate, new Date()) : null;
  const name = (b: string) => getLocalizedBookName(b, i18n.language) ?? b;
  const label = (k: string) => { const [b, c] = k.split(":"); return `${name(b)} ${c}`; };

  // Grava a leitura no dia da semana certo, dentro do próprio plano (vai no backup).
  const credit = (r: WsReading, day: number | null): WsReading => {
    if (track === "meeting") return r;
    markReadToday(track);
    return day !== null && r.weekday?.enabled ? { ...r, weekday: creditPlan(r.weekday, day, new Date()) } : r;
  };
  // Plano antigo/backup de versão anterior: começa a contagem hoje, sem atraso de surpresa.
  const wdPersonal = data.reading.weekday;
  const wdFamily = data.readings?.family?.weekday;
  useEffect(() => {
    const need = (w?: typeof wdPersonal) => !!w?.enabled && !w.since;
    if (!need(wdPersonal) && !need(wdFamily)) return;
    const now = new Date();
    update((d) => (["personal", "family"] as const).reduce((acc, tr) => {
      const r = getReading(acc, tr);
      return r.weekday && need(r.weekday) ? putReading(acc, tr, { ...r, weekday: seedPlan(r.weekday, weekdayLog(tr), now) }) : acc;
    }, d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wdPersonal, wdFamily]);
  const pendingTracks = useMemo(
    () => (["personal", "family"] as const).filter((tr) => { const r = getReading(data, tr); return weekdayPending(r.weekday, new Set(r.done), new Date()); }),
    [data]);
  const pendingHere = track !== "meeting" && (pendingTracks as Track[]).includes(track);
  // Dias da semana com leitura atrasada (meta "Dias"), cada dia no seu ciclo de 7 dias.
  const lateList = useMemo(() => (track === "meeting" ? [] : lateWeekdays(rdata.weekday, new Date(), done)), [rdata.weekday, track, done]);
  // Edição do plano: as datas de controle vêm sempre do plano salvo.
  const editWeekday = (wp: NonNullable<WsReading["weekday"]>) => update((d) => { const r = getReading(d, track); return putReading(d, track, { ...r, weekday: planEdited(r.weekday, wp, new Date()) }); });
  const lateDays = lateList.length;
  const dayNames = useDayNames();
  // "Continuar · Gên 17:1-27": livro abreviado + primeiro ao último versículo.
  const contKey = next ? (wdOn ? next : today?.keys.find((k) => !done.has(k)) ?? next) : null;
  const contSpan = useChapterSpan(contKey);
  const contLabel = contKey ? (() => { const [b, c] = contKey.split(":"); return `${abbreviateBookAlways(name(b))} ${c}${contSpan}`; })() : "";
  const shortLabel = (k: string) => { const [b, c] = k.split(":"); return `${abbreviateBookAlways(name(b))} ${c}`; };
  const setReadingState = (patch: Partial<WsReading>) => update((d) => putReading(d, track, { ...getReading(d, track), ...patch }));
  const toggle = (k: string, force?: boolean) => update((d) => {
    const r = getReading(d, track);
    const s = new Set(r.done);
    const on = force ?? !s.has(k);
    if (on) s.add(k); else s.delete(k);
    const base = { ...r, done: [...s] };
    return putReading(d, track, on ? credit(base, readingDay ?? creditDayFor(r.weekday, k, new Date(), lateList)) : base);
  });
  const setPlan = (p: ReadingPlan) => {
    setReadingState((p === "year" || p === "custom") && plan !== p
      ? { plan: p, startDate: new Date().toISOString().slice(0, 10), ...(p === "custom" && !rdata.custom ? { custom } : {}) } : { plan: p });
    if (p === "custom") setCfgOpen(true);
  };
  const setCustom = (patch: Partial<CustomPlan>) => setReadingState({ custom: { ...custom, ...patch } });
  const toggleBook = (b: string) => setCustom({ books: custom.books.includes(b) ? custom.books.filter((x) => x !== b) : [...custom.books, b] });

  const drawerEl = (
    <HighlightsDrawer open={drawer} onOpenChange={setDrawer} highlights={data.highlights} presetRef={preset}
      onSave={(h) => update((d) => {
        const old = d.highlights.find((x) => x.id === h.id);
        const tr = old ? old.track : track === "personal" ? undefined : track;
        const tagged = { ...h, ...(tr ? { track: tr } : {}), ...(old?.star ? { star: true } : {}) };
        return { ...d, highlights: [tagged, ...d.highlights.filter((x) => x.id !== h.id)] };
      })}
      onDelete={(id) => update((d) => ({ ...d, highlights: d.highlights.filter((x) => x.id !== id) }))} />
  );

  if (reading) {
    const fontClass = { sm: "text-sm", md: "text-base", lg: "text-lg" }[data.settings.fontSize];
    return (
      <>
        <CleanReader chapterKey={reading} done={done.has(reading)} percent={track === "meeting" ? undefined : percent} fontClass={fontClass}
          bookProgress={track === "meeting" ? { done: Number(reading.split(":")[1]) || 0, total: chaptersOf(reading.split(":")[0]) } : (() => { const b = reading.split(":")[0]; const n = chaptersOf(b); let c = 0; for (let i = 1; i <= n; i++) if (done.has(`${b}:${i}`)) c++; return { done: c, total: n }; })()}
          key={reading} initialVerse={jumpVerse}
          onBack={() => { setReading(null); setReadingDay(null); setJumpVerse(null); }}
          onNote={(ref, text) => { setReaderReturn({ track, chapterKey: reading, readingDay, verse: verseFromRef(ref) }); onNote(ref, text); }}
          onDone={() => {
            toggle(reading, true);
            if (readingDay !== null && rdata.weekday) {
              const wp = weekdayAdvance(rdata.weekday, readingDay, reading);
              const rd = readingDay, rk = reading;
              update((d) => { const r = getReading(d, track); return r.weekday ? putReading(d, track, { ...r, weekday: weekdayAdvance(r.weekday, rd, rk) }) : d; });
              setReading(weekdayNextUnread(wp, readingDay, new Set([...done, reading]))); return;
            }
            if (track === "meeting" && meetingKeys.includes(reading)) { const n = meetingKeys.find((k) => k !== reading && !done.has(k)); setReading(n ?? null); return; }
            const i = seq.indexOf(reading); const n = seq.slice(i + 1).find((k) => !done.has(k)); setReading(n ?? null);
          }}
          onHighlight={(ref) => { setPreset(ref); setDrawer(true); }}
          onImport={() => setBibleOpen(true)} />
        {drawerEl}
        <BibleManagerDialog open={bibleOpen} onOpenChange={setBibleOpen} />
      </>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <TrackPills value={track} alert={pendingTracks} onChange={(v) => { setTrack(v); setReadingDay(null); }} />

      {track === "meeting" && (<>
        <CollapsibleSection id="meeting.week" title={t("guestWs.meetingWeek", { defaultValue: "Leitura da semana" })}
          summary={meetingKeys.length ? `${meetingKeys.length === 1 ? label(meetingKeys[0]) : `${label(meetingKeys[0])}–${meetingKeys[meetingKeys.length - 1].split(":")[1]}`} · ${meetingKeys.filter((k) => done.has(k)).length}/${meetingKeys.length}` : undefined}>
        <MeetingWeekCard key={rdata.meetingWeek?.anchorMonday ?? "new"} mw={rdata.meetingWeek} keys={meetingKeys} done={done} label={label}
          onSet={(m) => setReadingState({ meetingWeek: m })} onRead={(k) => setReading(k)} />
        </CollapsibleSection>
        <CollapsibleSection id="meeting.comment" title={t("guestWs.toComment", { defaultValue: "Para comentar" })} summary={String(toComment.length)}>
        <CommentCard list={toComment} onOpen={() => setCommentOpen(true)}
          onStar={(id) => update((d) => ({ ...d, highlights: d.highlights.map((h) => h.id === id ? { ...h, star: !h.star } : h) }))} />
        </CollapsibleSection>
      </>)}
      {commentOpen && <CommentMode list={toComment} onClose={() => setCommentOpen(false)} />}

      {track !== "meeting" && <>
      <CollapsibleSection id={`${track}.goal`} title={t("guestWs.goal", { defaultValue: "Meta de leitura" })}
        summary={wdOn
          ? `${t("guestWs.planDays", { defaultValue: "Dias" })}${(() => { const k = weekdayNextUnread(rdata.weekday!, new Date().getDay(), done); return k ? ` · ${label(k)}` : ""; })()}`
          : { canon: t("guestWs.planCanon", { defaultValue: "Ordem dos livros" }), chrono: t("guestWs.planChrono", { defaultValue: "Cronológica" }), year: t("guestWs.planYear", { defaultValue: "1 ano" }), custom: t("guestWs.planCustom", { defaultValue: "Personalizada" }) }[plan]}>
      <div className="space-y-3">
      <div className="grid grid-cols-6 gap-1 rounded-xl border bg-card p-1" role="radiogroup" aria-label={t("guestWs.goal", { defaultValue: "Meta de leitura" })}>
        {([["canon", t("guestWs.planCanon", { defaultValue: "Ordem dos livros" }), "col-span-3"], ["chrono", t("guestWs.planChrono", { defaultValue: "Cronológica" }), "col-span-3"], ["year", t("guestWs.planYear", { defaultValue: "1 ano" }), "col-span-2"], ["weekday", t("guestWs.planDays", { defaultValue: "Dias" }), "col-span-2"], ["custom", t("guestWs.planCustomShort", { defaultValue: "Pers." }), "col-span-2"]] as const).map(([id, l, span]) => {
          const on = id === "weekday" ? wdOn : !wdOn && plan === id;
          return (
          <button key={id} type="button" role="radio" aria-checked={on}
            onClick={() => { if (id === "weekday") editWeekday({ ...(rdata.weekday ?? newWeekday()), enabled: true }); else { if (wdOn) setReadingState({ weekday: { ...rdata.weekday!, enabled: false } }); setPlan(id); } }}
            className={cn("min-h-9 rounded-lg px-1 text-xs font-medium", span, on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/60")}>{l}</button>
          );
        })}
      </div>
      {wdOn && <WeekdayCard pending={pendingHere} late={lateList} plan={rdata.weekday!} label={label} shortLabel={shortLabel} done={done} onChange={editWeekday}
        onMark={(keys, on, day) => update((d) => { const r = getReading(d, track); const s = new Set(r.done); keys.forEach((k) => on ? s.add(k) : s.delete(k)); const base = { ...r, done: [...s] }; return putReading(d, track, on && keys.length ? credit(base, day) : base); })}
        onRead={(k, d) => { setReadingDay(d); setReading(k); }} />}

      {!wdOn && plan === "custom" && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <button type="button" onClick={() => setCfgOpen(!cfgOpen)} aria-expanded={cfgOpen} className="flex w-full items-center gap-2 text-left text-sm font-medium">
            <Settings2 className="h-4 w-4" /><span className="flex-1">{t("guestWs.customCfg", { defaultValue: "Minha programação ({{n}} livros)", n: custom.books.length })}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", cfgOpen && "rotate-180")} />
          </button>
          {cfgOpen && (<>
            <div className="flex flex-wrap gap-1.5">
              {([["all", t("guestWs.allBooks", { defaultValue: "Todos" }), ALL_BOOKS], ["ot", t("guestWs.ot", { defaultValue: "Escrituras Hebraicas" }), ALL_BOOKS.slice(0, 39)], ["nt", t("guestWs.nt", { defaultValue: "Escrituras Gregas" }), ALL_BOOKS.slice(39)], ["none", t("guestWs.noneBooks", { defaultValue: "Nenhum" }), []]] as const).map(([id, l, books]) => (
                <Button key={id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCustom({ books: [...books] })}>{l}</Button>
              ))}
            </div>
            <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
              {ALL_BOOKS.map((b) => (
                <button key={b} type="button" aria-pressed={custom.books.includes(b)} onClick={() => toggleBook(b)}
                  className={cn("rounded-full border px-2 py-0.5 text-xs", custom.books.includes(b) ? "bg-primary text-primary-foreground" : "hover:bg-accent/60")}>{name(b)}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1"><span className="text-muted-foreground">{t("guestWs.perDay", { defaultValue: "Capítulos por dia" })}</span>
                <Input type="number" min={1} max={50} value={custom.perDay ?? ""} className="h-8"
                  onChange={(e) => { const n = Math.round(Number(e.target.value)); setCustom({ perDay: n >= 1 && n <= 50 ? n : null }); }} placeholder={t("guestWs.free", { defaultValue: "Livre" })} /></label>
              <label className="space-y-1"><span className="text-muted-foreground">{t("guestWs.endDate", { defaultValue: "ou terminar em" })}</span>
                <Input type="date" value={custom.endDate ?? ""} className="h-8" onChange={(e) => setCustom({ endDate: e.target.value || null })} /></label>
            </div>
            <p className="text-[11px] text-muted-foreground">{t("guestWs.customHint", { defaultValue: "Sem ritmo definido, a meta é livre: só o progresso dos livros escolhidos." })}</p>
          </>)}
        </div>
      )}
      </div>
      </CollapsibleSection>

      {<>
      <div className="sticky top-0 z-20 space-y-1.5 rounded-xl border bg-card/95 p-3 backdrop-blur" title={today && today.keys.length > 0 ? t("guestWs.todayPlan", { defaultValue: "Dia {{d}} — hoje: {{from}} a {{to}}", d: today.day, from: label(today.keys[0]), to: label(today.keys[today.keys.length - 1]) }) : undefined}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{percent}%</span>
          <Progress value={percent} className="h-1.5 flex-1" />
          {next && <Button size="sm" className={cn("h-8 gap-1 rounded-full", pendingHere && "ring-2 ring-destructive ring-offset-2 ring-offset-background")} aria-label={pendingHere ? t("guestWs.pendingToday", { defaultValue: "Leitura de hoje pendente" }) : undefined} onClick={() => { const k = wdOn ? next : today?.keys.find((x) => !done.has(x)) ?? next; if (wdOn) setReadingDay(new Date().getDay()); setReading(k); }}><Play className="h-3.5 w-3.5" />{t("guestWs.continue", { defaultValue: "Continuar" })} · {contLabel}</Button>}
        </div>
        {lateDays > 0 && (
          <p className="text-xs font-medium text-destructive" role="status">
            ⚠ {lateDays === 1 ? t("guestWs.lateDay", { defaultValue: "Leitura atrasada · 1 dia" }) : t("guestWs.lateDaysN", { defaultValue: "Leitura atrasada · {{n}} dias", n: lateDays })}
            <span className="capitalize"> ({lateList.map((d) => dayNames[d]).join(", ")})</span>
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">{track === "family" ? t("guestWs.trackFamily", { defaultValue: "Família" }) : t("guestWs.trackPersonal", { defaultValue: "Pessoal" })} · {t("guestWs.chaptersDone", { defaultValue: "{{n}} de {{total}} capítulos", n: wdp ? wdp.done : doneIn, total: (wdp ? wdp.total : total).toLocaleString(i18n.language) })}</p>
      </div>

      </>}

      <div className="flex items-center gap-1">
        <button type="button" onClick={toggleList} aria-expanded={listOpen} className="flex flex-1 items-center gap-2 text-left text-xs font-semibold uppercase text-muted-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", !listOpen && "-rotate-90")} />
          {t("guestWs.booksList", { defaultValue: "Livros da Bíblia ({{n}})", n: bookOrder(plan, custom).length })}
        </button>
        {listOpen && <>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpenBooks(new Set(bookOrder(plan, custom)))}>{t("guestWs.expandAll", { defaultValue: "Expandir todos" })}</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpenBooks(new Set())}>{t("guestWs.collapseAll", { defaultValue: "Recolher todos" })}</Button>
        </>}
      </div>
      {listOpen && <ul className="divide-y rounded-xl border bg-card">
        {bookOrder(plan, custom).map((b) => {
          const n = chaptersOf(b);
          let c = 0; for (let i = 1; i <= n; i++) if (done.has(`${b}:${i}`)) c++;
          const isOpen = openBooks.has(b);
          return (
            <li key={b}>
              <button type="button" onClick={() => setOpenBooks((s) => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; })} aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-accent/40">
                <span className={cn("flex-1", c === n && "text-muted-foreground line-through")}>{name(b)}</span>
                <span className="text-xs text-muted-foreground">{c}/{n}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="space-y-2 px-4 pb-3">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
                    {Array.from({ length: n }, (_, i) => `${b}:${i + 1}`).map((k, i) => (
                      <Popover key={k} open={pick === k} onOpenChange={(o) => setPick(o ? k : null)}>
                        <PopoverTrigger asChild>
                          <button type="button" aria-pressed={pick === k}
                            className={cn("h-9 rounded-md border text-xs font-medium", done.has(k) ? "bg-primary text-primary-foreground" : "hover:bg-accent/60", pick === k && "ring-2 ring-ring ring-offset-2 ring-offset-background")}>{i + 1}</button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto rounded-xl p-1">
                          <div className="flex flex-col">
                            <Button size="sm" variant="ghost" className="justify-start gap-2" onClick={() => { setPick(null); setReading(k); }}><Play className="h-3.5 w-3.5" />{t("guestWs.startReading", { defaultValue: "Começar a ler" })}</Button>
                            <Button size="sm" variant="ghost" className="justify-start" onClick={() => { setPick(null); toggle(k); }}>{done.has(k) ? t("guestWs.unmark", { defaultValue: "Desmarcar" }) : t("guestWs.mark", { defaultValue: "Marcar como lido" })}</Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>}
      </>}

      <CollapsibleSection id={`${track}.bottom`} title={`${t("guestWs.readingNotes", { defaultValue: "Anotações de leitura" })} · ${t("guestWs.highlights", { defaultValue: "Pontos altos" })}`}
        summary={`★ ${data.highlights.length}`}>
      <section className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {([["notes", t("guestWs.readingNotes", { defaultValue: "Anotações de leitura" })], ["highlights", `${t("guestWs.highlights", { defaultValue: "Pontos altos" })} · ${data.highlights.length}`], ["jw", `JW Library${data.jwNotes.length ? ` · ${data.jwNotes.length}` : ""}`]] as const).map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={bottomTab === id} onClick={() => setBottomTab(id)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", bottomTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/60")}>
              {id === "highlights" && <Sparkles className="mr-1 inline h-3.5 w-3.5" />}{l}
            </button>
          ))}
        </div>
        {bottomTab === "notes" ? notes : bottomTab === "jw" ? <JwLibraryPanel data={data} update={update} /> : (
          <div className="space-y-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setPreset(undefined); setDrawer(true); }}>
              <Plus className="h-4 w-4" />{t("guestWs.newHighlight", { defaultValue: "Novo ponto alto" })}
            </Button>
            <div className="flex flex-wrap gap-1">
              {([[null, t("guestWs.all", { defaultValue: "Todas" })], ["personal", t("guestWs.trackPersonal", { defaultValue: "Pessoal" })], ["family", t("guestWs.trackFamily", { defaultValue: "Família" })], ["meeting", t("guestWs.trackMeeting", { defaultValue: "Reunião" })]] as const).map(([id, l]) => (
                <button key={id ?? "all"} type="button" aria-pressed={hlFilter === id} onClick={() => setHlFilter(id)}
                  className={cn("rounded-full border px-2.5 py-1 text-[11px]", hlFilter === id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-accent/60")}>{l}</button>
              ))}
            </div>
            {filterByTrack(data.highlights, hlFilter).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("guestWs.noHighlights", { defaultValue: "Nenhum ponto alto ainda." })}</p>
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {filterByTrack(data.highlights, hlFilter).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 20).map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => { setPreset(undefined); setDrawer(true); }} className="w-full px-4 py-2.5 text-left hover:bg-accent/40">
                      <p className="text-sm font-semibold">{h.ref || "—"} <span className="ml-1 rounded-full border px-1.5 text-[10px] font-normal text-muted-foreground">{({ personal: "P", family: "F", meeting: "R" } as const)[h.track ?? "personal"]}</span>{h.star && <span className="ml-1 text-primary">★</span>}</p>
                      {h.text && <p className="line-clamp-2 text-xs text-muted-foreground">{h.text}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      </CollapsibleSection>

      {drawerEl}
    </div>
  );
}
