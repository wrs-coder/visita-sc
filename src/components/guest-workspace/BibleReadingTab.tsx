// Aba "Leitura da Bíblia": meta, progresso, capítulos, pontos altos e leitura limpa.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Sparkles, Play, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BibleManagerDialog } from "@/components/bible/BibleManagerDialog";
import { getLocalizedBookName } from "@/lib/bible-canon";
import { ALL_BOOKS, bookOrder, chapterSequence, chaptersOf, customPlanDay, yearPlanDay, TOTAL_CHAPTERS, type CustomPlan, type ReadingPlan } from "@/lib/bible-chapters";
import type { WsData } from "@/lib/guest-workspace-store";
import { cn } from "@/lib/utils";
import { HighlightsDrawer } from "./HighlightsDrawer";
import { CleanReader } from "./CleanReader";

const BOOKS_OPEN_KEY = "guest.workspace.booksOpen";

export function BibleReadingTab({ data, update, notes, onNote }: { data: WsData; update: (fn: (d: WsData) => WsData) => void; notes: ReactNode; onNote: (ref: string, text: string) => void }) {
  const { t, i18n } = useTranslation();
  const { plan, done: doneList, startDate } = data.reading;
  const done = useMemo(() => new Set(doneList), [doneList]);
  const [openBooks, setOpenBooks] = useState<Set<string>>(new Set());
  const [listOpen, setListOpen] = useState(true);
  const [cfgOpen, setCfgOpen] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(BOOKS_OPEN_KEY) === "0") setListOpen(false); } catch { /* */ } }, []);
  const toggleList = () => { const n = !listOpen; setListOpen(n); try { localStorage.setItem(BOOKS_OPEN_KEY, n ? "1" : "0"); } catch { /* */ } };
  const custom: CustomPlan = data.reading.custom ?? { books: ALL_BOOKS, perDay: null, endDate: null };
  const [reading, setReading] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();
  const [bibleOpen, setBibleOpen] = useState(false);

    const seq = chapterSequence(plan, custom);
  const total = plan === "custom" ? seq.length : TOTAL_CHAPTERS;
  const doneIn = plan === "custom" ? seq.filter((k) => done.has(k)).length : done.size;
  const percent = total ? Math.round((doneIn / total) * 100) : 0;
  const next = seq.find((k) => !done.has(k)) ?? null;
  const today = plan === "year" ? yearPlanDay(startDate, new Date()) : plan === "custom" ? customPlanDay(custom, startDate, new Date()) : null;
  const name = (b: string) => getLocalizedBookName(b, i18n.language) ?? b;
  const label = (k: string) => { const [b, c] = k.split(":"); return `${name(b)} ${c}`; };

  const setReadingState = (patch: Partial<WsData["reading"]>) => update((d) => ({ ...d, reading: { ...d.reading, ...patch } }));
  const toggle = (k: string, force?: boolean) => update((d) => {
    const s = new Set(d.reading.done);
    const on = force ?? !s.has(k);
    if (on) s.add(k); else s.delete(k);
    return { ...d, reading: { ...d.reading, done: [...s] } };
  });
  const setPlan = (p: ReadingPlan) => {
    setReadingState((p === "year" || p === "custom") && plan !== p
      ? { plan: p, startDate: new Date().toISOString().slice(0, 10), ...(p === "custom" && !data.reading.custom ? { custom } : {}) } : { plan: p });
    if (p === "custom") setCfgOpen(true);
  };
  const setCustom = (patch: Partial<CustomPlan>) => setReadingState({ custom: { ...custom, ...patch } });
  const toggleBook = (b: string) => setCustom({ books: custom.books.includes(b) ? custom.books.filter((x) => x !== b) : [...custom.books, b] });

  const drawerEl = (
    <HighlightsDrawer open={drawer} onOpenChange={setDrawer} highlights={data.highlights} presetRef={preset}
      onSave={(h) => update((d) => ({ ...d, highlights: [h, ...d.highlights.filter((x) => x.id !== h.id)] }))}
      onDelete={(id) => update((d) => ({ ...d, highlights: d.highlights.filter((x) => x.id !== id) }))} />
  );

  if (reading) {
    const fontClass = { sm: "text-sm", md: "text-base", lg: "text-lg" }[data.settings.fontSize];
    return (
      <>
        <CleanReader chapterKey={reading} done={done.has(reading)} percent={percent} fontClass={fontClass}
          onBack={() => setReading(null)}
          onNote={onNote}
          onDone={() => { toggle(reading, true); const i = seq.indexOf(reading); const n = seq.slice(i + 1).find((k) => !done.has(k)); setReading(n ?? null); }}
          onHighlight={(ref) => { setPreset(ref); setDrawer(true); }}
          onImport={() => setBibleOpen(true)} />
        {drawerEl}
        <BibleManagerDialog open={bibleOpen} onOpenChange={setBibleOpen} />
      </>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="grid grid-cols-4 gap-1 rounded-xl border bg-card p-1" role="radiogroup" aria-label={t("guestWs.goal", { defaultValue: "Meta de leitura" })}>
        {([["canon", t("guestWs.planCanon", { defaultValue: "Ordem dos livros" })], ["chrono", t("guestWs.planChrono", { defaultValue: "Cronológica" })], ["year", t("guestWs.planYear", { defaultValue: "1 ano" })], ["custom", t("guestWs.planCustom", { defaultValue: "Personalizada" })]] as const).map(([id, l]) => (
          <button key={id} type="button" role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}
            className={cn("min-h-9 rounded-lg px-1 text-xs font-medium", plan === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/60")}>{l}</button>
        ))}
      </div>

      {plan === "custom" && (
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

      <div className="space-y-2 rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{percent}%</span>
          <span className="text-muted-foreground">{t("guestWs.chaptersDone", { defaultValue: "{{n}} de {{total}} capítulos", n: doneIn, total: total.toLocaleString(i18n.language) })}</span>
        </div>
        <Progress value={percent} />
        {today && today.keys.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("guestWs.todayPlan", { defaultValue: "Dia {{d}} — hoje: {{from}} a {{to}}", d: today.day, from: label(today.keys[0]), to: label(today.keys[today.keys.length - 1]) })}
          </p>
        )}
        {next && <Button size="sm" className="mt-1 gap-1" onClick={() => setReading(today?.keys.find((k) => !done.has(k)) ?? next)}><Play className="h-4 w-4" />{t("guestWs.continue", { defaultValue: "Continuar" })} · {label(today?.keys.find((k) => !done.has(k)) ?? next)}</Button>}
      </div>

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
                      <button key={k} type="button" aria-pressed={pick === k} onClick={() => setPick(k)}
                        className={cn("h-9 rounded-md border text-xs font-medium", done.has(k) ? "bg-primary text-primary-foreground" : "hover:bg-accent/60", pick === k && "ring-2 ring-ring ring-offset-2 ring-offset-background")}>{i + 1}</button>
                    ))}
                  </div>
                  {(() => {
                    const k = pick?.startsWith(`${b}:`) ? pick : Array.from({ length: n }, (_, i) => `${b}:${i + 1}`).find((x) => !done.has(x)) ?? `${b}:1`;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" onClick={() => setReading(k)}>{t("guestWs.read", { defaultValue: "Ler" })} {label(k)}</Button>
                        <Button size="sm" variant="outline" onClick={() => toggle(k)}>{done.has(k) ? t("guestWs.unmark", { defaultValue: "Desmarcar" }) : t("guestWs.mark", { defaultValue: "Marcar como lido" })}</Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </li>
          );
        })}
      </ul>}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("guestWs.readingNotes", { defaultValue: "Anotações de leitura" })}</h3>
        {notes}
      </section>

      <div className="fixed inset-x-0 bottom-3 z-40 flex justify-center pointer-events-none">
        <Button className="pointer-events-auto gap-1 rounded-full shadow-lg" onClick={() => { setPreset(undefined); setDrawer(true); }}>
          <Sparkles className="h-4 w-4" />{t("guestWs.highlights", { defaultValue: "Pontos altos" })} · {data.highlights.length}
        </Button>
      </div>
      {drawerEl}
    </div>
  );
}
