// Partes extras da leitura: pílulas das leituras, dias da semana, semana da
// reunião, "Para comentar" e modo comentário em tela cheia.
import { BibleRefText } from "@/components/bible/BibleRefText";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pencil, Star, X, ChevronLeft, ChevronRight, ExternalLink, Maximize2, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { getLocalizedBookName } from "@/lib/bible-canon";
import { ALL_BOOKS, chaptersOf, type Highlight } from "@/lib/bible-chapters";
import { emptyWeekday, weekdayNextUnread, weekdayDayDone, weekdayBookDays, weekdaySeq, type MeetingWeek, type Track, type WeekdayPlan, mondayOf } from "@/lib/bible-tracks";
import { cn } from "@/lib/utils";
import { useChapterSpan } from "./use-chapter-span";

const pill = (on: boolean) => cn("min-h-9 rounded-full px-3 text-xs font-medium transition-colors", on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60");

export function TrackPills({ value, onChange, alert = [] }: { value: Track; onChange: (t: Track) => void; alert?: readonly Track[] }) {
  const { t } = useTranslation();
  const items: [Track, string][] = [["personal", t("guestWs.trackPersonal", { defaultValue: "Pessoal" })], ["family", t("guestWs.trackFamily", { defaultValue: "Família" })], ["meeting", t("guestWs.trackMeeting", { defaultValue: "Reunião" })]];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-full border bg-card p-1" role="tablist" aria-label={t("guestWs.tracks", { defaultValue: "Tipo de leitura" })}>
      {items.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={cn(pill(value === id), "relative")}>{l}{alert.includes(id) && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-destructive" aria-label={t("guestWs.pendingToday", { defaultValue: "Leitura de hoje pendente" })} />}</button>)}
    </div>
  );
}

function useDayNames() {
  const { i18n } = useTranslation();
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(i18n.language, { weekday: "short" }).replace(".", ""));
}

export function WeekdayCard({ plan, onChange, onRead, label, shortLabel, done, onMark, pending = false }: { shortLabel?: (k: string) => string; pending?: boolean; plan: WeekdayPlan; onChange: (p: WeekdayPlan) => void; onRead: (key: string, day: number) => void; label: (k: string) => string; done: Set<string>; onMark: (keys: string[], on: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const names = useDayNames();
  const [day, setDay] = useState(() => new Date().getDay());
  const [edit, setEdit] = useState(false);
  const [mark, setMark] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const today = new Date().getDay();
  const seq = weekdaySeq(plan, day);
  const allDone = weekdayDayDone(plan, day, done);
  const cur = weekdayNextUnread(plan, day, done);
  const curSpan = useChapterSpan(cur);
  const books = plan.days[day] ?? [];
  const bn = (b: string) => getLocalizedBookName(b, i18n.language) ?? b;
  const bookDays = weekdayBookDays(plan);
  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const empty = !(plan.days[d] ?? []).length;
          return (
            <button key={d} type="button" role="tab" aria-selected={day === d} onClick={() => setDay(d)}
              className={cn("relative min-h-9 min-w-12 shrink-0 rounded-full border px-3 text-xs font-medium capitalize", day === d ? "border-primary bg-primary text-primary-foreground" : empty ? "text-muted-foreground/50" : "text-foreground hover:bg-accent/60")}>
              {names[d]}
              {d === today && <span className={cn("absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full", day === d ? "bg-primary-foreground" : "bg-primary")} />}
            </button>
          );
        })}
      </div>
      {cur ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{books.map(bn).join(" → ")} · {seq.filter((k) => done.has(k)).length}/{seq.length}</p>
          <Button className={cn("h-11 w-full gap-2 rounded-xl", pending && day === new Date().getDay() && "ring-2 ring-destructive ring-offset-2 ring-offset-background")} onClick={() => onRead(cur, day)}><Play className="h-4 w-4" />{t("guestWs.continue", { defaultValue: "Continuar" })} · {(shortLabel ?? label)(cur)}{curSpan}</Button>
        </div>
      ) : allDone ? (
        <div className="space-y-2 text-center">
          <p className="py-1 text-sm font-medium text-primary">{t("guestWs.dayDone", { defaultValue: "Concluído ✓" })}</p>
          <Button size="sm" variant="outline" onClick={() => onMark(seq, false)}>{t("guestWs.restart", { defaultValue: "Recomeçar" })}</Button>
        </div>
      ) : <p className="py-2 text-center text-sm text-muted-foreground">{t("guestWs.noDayReading", { defaultValue: "Sem leitura neste dia." })}</p>}
      <div className="flex flex-wrap justify-between gap-1">
        <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" />{t("guestWs.editDays", { defaultValue: "Editar dias" })}</Button>
        {seq.length > 0 && <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setLast(null); setMark(true); }}><CheckSquare className="h-3.5 w-3.5" />{t("guestWs.markRead", { defaultValue: "Marcar capítulos lidos" })}</Button>}
      </div>
      <Drawer open={mark} onOpenChange={setMark}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader><DrawerTitle><span className="capitalize">{names[day]}</span> · {t("guestWs.readChapters", { defaultValue: "capítulos lidos" })}</DrawerTitle>
            <DrawerDescription>{t("guestWs.markHint", { defaultValue: "Toque nos capítulos que você já leu." })}</DrawerDescription></DrawerHeader>
          <div className="mx-auto w-full max-w-2xl space-y-4 overflow-y-auto px-4 pb-6">
            {books.map((b) => {
              const n = chaptersOf(b);
              const cnt = Array.from({ length: n }, (_, i) => `${b}:${i + 1}`).filter((k) => done.has(k)).length;
              return (
                <div key={b} className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-medium">{bn(b)}</span><span className="text-muted-foreground">{cnt} / {n}</span></div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {Array.from({ length: n }, (_, i) => {
                      const k = `${b}:${i + 1}`; const on = done.has(k);
                      return <button key={k} type="button" aria-pressed={on} onClick={() => { setLast(k); onMark([k], !on); }}
                        className={cn("h-9 rounded-lg border text-xs", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent/60", last === k && "ring-2 ring-ring")}>{i + 1}</button>;
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={!last} onClick={() => last && onMark(seq.slice(0, seq.indexOf(last) + 1), true)}>{t("guestWs.markUpTo", { defaultValue: "Marcar até aqui" })}</Button>
              <Button variant="outline" className="flex-1" onClick={() => onMark(seq, false)}>{t("guestWs.clear", { defaultValue: "Limpar" })}</Button>
            </div>
            <Button className="w-full" onClick={() => setMark(false)}>{t("guestWs.finish", { defaultValue: "Concluir" })}</Button>
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={edit} onOpenChange={setEdit}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader><DrawerTitle>{t("guestWs.weekdays", { defaultValue: "Dias da semana" })} · <span className="capitalize">{names[day]}</span></DrawerTitle>
            <DrawerDescription>{t("guestWs.weekdaysHint", { defaultValue: "Toque nos livros na ordem em que quer ler." })}</DrawerDescription></DrawerHeader>
          <div className="mx-auto w-full max-w-2xl space-y-3 overflow-y-auto px-4 pb-6">
            <div className="flex gap-1.5 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" onClick={() => setDay(d)} className={cn(pill(day === d), "shrink-0 border capitalize")}>{names[d]}</button>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {ALL_BOOKS.map((b) => {
                const i = books.indexOf(b);
                return (
                  <button key={b} type="button" aria-pressed={i >= 0}
                    onClick={() => { const days = plan.days.map((x) => [...x]); days[day] = i >= 0 ? books.filter((x) => x !== b) : [...books, b]; onChange({ ...plan, days }); }}
                    className={cn("rounded-full border px-2 py-1 text-xs", i >= 0 ? "bg-primary text-primary-foreground" : "hover:bg-accent/60")}>
                    {i >= 0 && <span className="mr-1 font-semibold">{i + 1}</span>}{bn(b)}
                    {(bookDays.get(b) ?? []).map((d) => (
                      <span key={d} className={cn("ml-1 rounded-full px-1.5 text-[10px] font-medium capitalize", d === day ? (i >= 0 ? "bg-primary-foreground/25" : "bg-primary/15 text-primary") : (i >= 0 ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground"))}>{names[d].slice(0, 3)}</span>
                    ))}
                  </button>
                );
              })}
            </div>
            <Button className="w-full" onClick={() => setEdit(false)}>{t("common.ok", { defaultValue: "OK" })}</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export const newWeekday = (): WeekdayPlan => ({ ...emptyWeekday(), enabled: true });

export function MeetingWeekCard({ mw, keys, onSet, onRead, label, done }: { mw?: MeetingWeek; keys: string[]; onSet: (m: MeetingWeek) => void; onRead: (k: string) => void; label: (k: string) => string; done: Set<string> }) {
  const { t, i18n } = useTranslation();
  const [edit, setEdit] = useState(!mw);
  const [book, setBook] = useState(keys[0]?.split(":")[0] ?? "B23");
  const [chTxt, setChTxt] = useState(String(keys[0]?.split(":")[1] ?? 1));
  const [perTxt, setPerTxt] = useState(String(mw?.perWeek ?? 2));
  const clampCh = (s: string) => Math.min(chaptersOf(book), Math.max(1, parseInt(s, 10) || 1));
  const clampPer = (s: string) => Math.min(20, Math.max(1, parseInt(s, 10) || 1));
  const bn = (b: string) => getLocalizedBookName(b, i18n.language) ?? b;
  const next = keys.find((k) => !done.has(k)) ?? keys[0];
  const range = keys.length ? (keys.length === 1 ? label(keys[0]) : `${label(keys[0])}–${keys[keys.length - 1].split(":")[1]}`) : "—";
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">{t("guestWs.meetingWeek", { defaultValue: "Leitura da semana" })}</p>
          <p className="text-lg font-semibold">{mw ? range : t("guestWs.meetingSetup", { defaultValue: "Defina o ponto de partida" })}</p>
        </div>
        <a href="https://wol.jw.org/" target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs text-muted-foreground hover:bg-accent/60">wol <ExternalLink className="h-3 w-3" /></a>
      </div>
      {mw && !edit && next && <Button className="h-11 w-full gap-2 rounded-xl" onClick={() => onRead(next)}><Play className="h-4 w-4" />{t("guestWs.read", { defaultValue: "Ler" })} · {label(next)}</Button>}
      {edit ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("guestWs.meetingHint", { defaultValue: "Informe a leitura desta semana. O app avança sozinho toda segunda-feira." })}</p>
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <select value={book} onChange={(e) => { setBook(e.target.value); setChTxt("1"); }} className="h-11 rounded-md border bg-background px-2 text-base">
              {ALL_BOOKS.map((b) => <option key={b} value={b}>{bn(b)}</option>)}
            </select>
            <Input type="text" inputMode="numeric" pattern="[0-9]*" value={chTxt} onChange={(e) => setChTxt(e.target.value.replace(/\D/g, "").slice(0, 3))} onBlur={() => setChTxt(String(clampCh(chTxt)))} className="h-11 text-base" aria-label={t("guestWs.chapter", { defaultValue: "Capítulo" })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><span className="flex-1 text-muted-foreground">{t("guestWs.perWeek", { defaultValue: "Capítulos por semana" })}</span>
            <Input type="text" inputMode="numeric" pattern="[0-9]*" value={perTxt} onChange={(e) => setPerTxt(e.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => setPerTxt(String(clampPer(perTxt)))} className="h-11 w-20 text-base" /></label>
          <div className="flex gap-2">
            {mw && <Button variant="ghost" className="flex-1" onClick={() => setEdit(false)}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>}
            <Button className="flex-1" onClick={() => { const c = clampCh(chTxt), p = clampPer(perTxt); setChTxt(String(c)); setPerTxt(String(p)); onSet({ anchorMonday: mondayOf(new Date()), startKey: `${book}:${c}`, perWeek: p }); setEdit(false); }}>{t("common.save", { defaultValue: "Salvar" })}</Button>
          </div>
        </div>
      ) : <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" />{t("guestWs.adjustWeek", { defaultValue: "Ajustar esta semana" })}</Button>}
    </div>
  );
}

export function CommentCard({ list, onStar, onOpen }: { list: Highlight[]; onStar: (id: string) => void; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 fill-primary text-primary" />
        <p className="flex-1 text-sm font-semibold">{t("guestWs.toComment", { defaultValue: "Para comentar" })} ({list.length})</p>
        {list.length > 0 && <Button size="sm" variant="outline" className="h-8 gap-1 rounded-full" onClick={onOpen}><Maximize2 className="h-3.5 w-3.5" />{t("guestWs.commentMode", { defaultValue: "Modo comentário" })}</Button>}
      </div>
      {list.length === 0 ? <p className="text-xs text-muted-foreground">{t("guestWs.toCommentEmpty", { defaultValue: "Pontos altos marcados na leitura da reunião aparecem aqui." })}</p> : (
        <ul className="divide-y">
          {list.map((h) => (
            <li key={h.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">{h.ref ? <BibleRefText text={h.ref} className="text-sm font-semibold" /> : <p className="text-sm font-semibold">—</p>}{h.text && <BibleRefText text={h.text} className="line-clamp-2 text-xs text-muted-foreground" />}</div>
              <button type="button" aria-label={t("guestWs.star", { defaultValue: "Para comentar" })} aria-pressed={!!h.star} onClick={() => onStar(h.id)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent/60">
                <Star className={cn("h-4 w-4", h.star ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommentMode({ list, onClose }: { list: Highlight[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const [x0, setX0] = useState<number | null>(null);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (k: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => { /* sem suporte */ });
    return () => { void lock?.release().catch(() => {}); };
  }, []);
  const h = list[Math.min(i, list.length - 1)];
  if (!h) return null;
  const go = (d: number) => setI((v) => Math.min(list.length - 1, Math.max(0, v + d)));
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-safe"
      onTouchStart={(e) => setX0((e.target as HTMLElement).closest("button,a,[role=button]") ? null : e.touches[0].clientX)} onTouchEnd={(e) => { if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); } setX0(null); }}>
      <div className="flex items-center justify-between px-3 py-2">
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("common.close", { defaultValue: "Fechar" })} onClick={onClose}><X className="h-5 w-5" /></Button>
        <span className="text-sm text-muted-foreground">{i + 1} {t("guestWs.of", { defaultValue: "de" })} {list.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {h.ref ? <BibleRefText text={h.ref} className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary" /> : <p className="mb-4 text-sm font-semibold text-primary">—</p>}
        {h.text && <BibleRefText text={h.text} className="text-2xl leading-relaxed" />}
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <Button variant="outline" className="h-12 flex-1 gap-1" disabled={i === 0} onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" />{t("guestWs.prev", { defaultValue: "anterior" })}</Button>
        <Button variant="outline" className="h-12 flex-1 gap-1" disabled={i >= list.length - 1} onClick={() => go(1)}>{t("guestWs.next", { defaultValue: "próximo" })}<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
