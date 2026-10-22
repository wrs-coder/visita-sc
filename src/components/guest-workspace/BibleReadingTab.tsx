// Aba "Leitura da Bíblia": meta, progresso, capítulos, pontos altos e leitura limpa.
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BibleManagerDialog } from "@/components/bible/BibleManagerDialog";
import { getLocalizedBookName } from "@/lib/bible-canon";
import { bookOrder, chapterSequence, chaptersOf, yearPlanDay, TOTAL_CHAPTERS, type ReadingPlan } from "@/lib/bible-chapters";
import type { WsData } from "@/lib/guest-workspace-store";
import { cn } from "@/lib/utils";
import { HighlightsDrawer } from "./HighlightsDrawer";
import { CleanReader } from "./CleanReader";

export function BibleReadingTab({ data, update, notes }: { data: WsData; update: (fn: (d: WsData) => WsData) => void; notes: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { plan, done: doneList, startDate } = data.reading;
  const done = useMemo(() => new Set(doneList), [doneList]);
  const [openBook, setOpenBook] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();
  const [bibleOpen, setBibleOpen] = useState(false);

  const percent = Math.round((done.size / TOTAL_CHAPTERS) * 100);
  const seq = chapterSequence(plan);
  const next = seq.find((k) => !done.has(k)) ?? null;
  const today = plan === "year" ? yearPlanDay(startDate, new Date()) : null;
  const name = (b: string) => getLocalizedBookName(b, i18n.language) ?? b;
  const label = (k: string) => { const [b, c] = k.split(":"); return `${name(b)} ${c}`; };

  const setReadingState = (patch: Partial<WsData["reading"]>) => update((d) => ({ ...d, reading: { ...d.reading, ...patch } }));
  const toggle = (k: string, force?: boolean) => update((d) => {
    const s = new Set(d.reading.done);
    const on = force ?? !s.has(k);
    if (on) s.add(k); else s.delete(k);
    return { ...d, reading: { ...d.reading, done: [...s] } };
  });
  const setPlan = (p: ReadingPlan) => setReadingState(p === "year" && plan !== "year"
    ? { plan: p, startDate: new Date().toISOString().slice(0, 10) } : { plan: p });

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
      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1" role="radiogroup" aria-label={t("guestWs.goal", { defaultValue: "Meta de leitura" })}>
        {([["canon", t("guestWs.planCanon", { defaultValue: "Ordem dos livros" })], ["chrono", t("guestWs.planChrono", { defaultValue: "Cronológica" })], ["year", t("guestWs.planYear", { defaultValue: "1 ano" })]] as const).map(([id, l]) => (
          <button key={id} type="button" role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}
            className={cn("min-h-9 rounded-lg px-1 text-xs font-medium", plan === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/60")}>{l}</button>
        ))}
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{percent}%</span>
          <span className="text-muted-foreground">{t("guestWs.chaptersDone", { defaultValue: "{{n}} de {{total}} capítulos", n: done.size, total: TOTAL_CHAPTERS.toLocaleString(i18n.language) })}</span>
        </div>
        <Progress value={percent} />
        {today && today.keys.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("guestWs.todayPlan", { defaultValue: "Dia {{d}} — hoje: {{from}} a {{to}}", d: today.day, from: label(today.keys[0]), to: label(today.keys[today.keys.length - 1]) })}
          </p>
        )}
        {next && <Button size="sm" className="mt-1 gap-1" onClick={() => setReading(today?.keys.find((k) => !done.has(k)) ?? next)}><Play className="h-4 w-4" />{t("guestWs.continue", { defaultValue: "Continuar" })} · {label(today?.keys.find((k) => !done.has(k)) ?? next)}</Button>}
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {bookOrder(plan).map((b) => {
          const n = chaptersOf(b);
          let c = 0; for (let i = 1; i <= n; i++) if (done.has(`${b}:${i}`)) c++;
          const isOpen = openBook === b;
          return (
            <li key={b}>
              <button type="button" onClick={() => setOpenBook(isOpen ? null : b)} aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-accent/40">
                <span className={cn("flex-1", c === n && "text-muted-foreground line-through")}>{name(b)}</span>
                <span className="text-xs text-muted-foreground">{c}/{n}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="space-y-2 px-4 pb-3">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
                    {Array.from({ length: n }, (_, i) => `${b}:${i + 1}`).map((k, i) => (
                      <button key={k} type="button" aria-pressed={done.has(k)} onClick={() => toggle(k)}
                        className={cn("h-9 rounded-md border text-xs font-medium", done.has(k) ? "bg-primary text-primary-foreground" : "hover:bg-accent/60")}>{i + 1}</button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("guestWs.tapHint", { defaultValue: "Toque para marcar. Para ler, use o botão abaixo." })}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: n }, (_, i) => `${b}:${i + 1}`).filter((k) => !done.has(k)).slice(0, 1).map((k) => (
                      <Button key={k} size="sm" variant="outline" onClick={() => setReading(k)}>{t("guestWs.read", { defaultValue: "Ler" })} {label(k)}</Button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

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
