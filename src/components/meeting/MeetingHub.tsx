// Reuniões de meio de semana: lista de semanas → programa de uma semana → controle de tempo.
// Tela por cima (z-40: acima do topo do app, abaixo das janelas z-50). Tudo no aparelho.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Copy, FileUp, MoreHorizontal, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { appConfirm, appPrompt } from "@/components/ui/app-dialogs";
import { useFocusChromeWhile } from "@/lib/focus-chrome";
import { pickFile } from "@/lib/share";
import { EventTimerFocus } from "@/components/circuit/EventTimerFocus";
import { clearTimer } from "@/lib/big-events/event-timer";
import { parseMwbFile } from "@/lib/meeting/mwb-import";
import {
  currentProgram, loadPrograms, mergeImported, newBlankProgram, partStarts, savePrograms, sortPrograms, timerId, toTimerParts, totalMinutes,
  type MeetingPart, type MeetingProgram, type MeetingSection,
} from "@/lib/meeting/meeting-store";
import { cn } from "@/lib/utils";

const SECTION_KEYS: Record<MeetingSection, [string, string]> = {
  open: ["meeting.section.open", "Abertura"],
  treasures: ["meeting.section.treasures", "Tesouros da Palavra de Deus"],
  ministry: ["meeting.section.ministry", "Faça seu melhor no ministério"],
  living: ["meeting.section.living", "Nossa vida cristã"],
  close: ["meeting.section.close", "Encerramento"],
};
const SECTION_BAR: Record<MeetingSection, string> = {
  open: "bg-muted-foreground", treasures: "bg-primary", ministry: "bg-warning", living: "bg-destructive", close: "bg-muted-foreground",
};

function fmtDate(iso: string, lang: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "short" });
}

export default function MeetingHub({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [list, setListState] = useState<MeetingProgram[]>(() => loadPrograms(userId));
  const [openId, setOpenId] = useState<string | null>(() => currentProgram(loadPrograms(userId), new Date())?.id ?? null);
  const [timing, setTiming] = useState(false);
  const [editPart, setEditPart] = useState<{ progId: string; part: MeetingPart; isNew: boolean } | null>(null);
  const [whenFor, setWhenFor] = useState<MeetingProgram | null>(null);
  const [review, setReview] = useState<{ weeks: MeetingProgram[]; pick: Set<string> } | null>(null);
  useFocusChromeWhile(true);

  const setList = (fn: (l: MeetingProgram[]) => MeetingProgram[]) => setListState((l) => { const n = sortPrograms(fn(l)); savePrograms(userId, n); return n; });
  const patch = (id: string, fn: (p: MeetingProgram) => MeetingProgram) =>
    setList((l) => l.map((p) => (p.id === id ? { ...fn(p), updatedAt: new Date().toISOString() } : p)));
  const prog = list.find((p) => p.id === openId) ?? null;

  // Voltar do Android/navegador fecha um nível por vez.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !timing && !editPart && !review && !whenFor) { if (openId) setOpenId(null); else onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, timing, editPart, review, whenFor, onClose]);

  const doImport = async () => {
    const f = await pickFile(".rtf,.zip,application/rtf,text/rtf,application/zip");
    if (!f) return;
    try {
      const weeks = await parseMwbFile(f.name, new Uint8Array(await f.arrayBuffer()), new Date());
      if (!weeks.length) { toast.error(t("meeting.importNone", { defaultValue: "Não encontrei semanas da apostila neste arquivo." })); return; }
      const have = new Set(list.map((p) => p.monday));
      setReview({ weeks, pick: new Set(weeks.filter((w) => !have.has(w.monday)).map((w) => w.monday)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("meeting.importFail", { defaultValue: "Não foi possível ler o arquivo." }));
    }
  };
  const applyImport = () => {
    if (!review) return;
    const chosen = review.weeks.filter((w) => review.pick.has(w.monday));
    setList((l) => mergeImported(l, chosen, review.pick));
    toast.success(t("meeting.imported", { defaultValue: "{{n}} semana(s) importada(s).", n: chosen.length }));
    setReview(null);
  };

  const createBlank = () => {
    const p = newBlankProgram(new Date());
    setList((l) => [...l, p]); setOpenId(p.id);
  };
  const rename = async (p: MeetingProgram) => {
    const v = await appPrompt(t("meeting.rename", { defaultValue: "Renomear reunião" }), p.title);
    if (v != null) patch(p.id, (x) => ({ ...x, title: v.trim().slice(0, 200) }));
  };
  const duplicate = (p: MeetingProgram) => {
    const c: MeetingProgram = { ...p, id: crypto.randomUUID(), title: `${p.title} (${t("meeting.copy", { defaultValue: "cópia" })})`.trim(), parts: p.parts.map((x) => ({ ...x, id: crypto.randomUUID() })) };
    setList((l) => [...l, c]);
  };
  const remove = async (p: MeetingProgram) => {
    const ok = await appConfirm({ title: t("meeting.deleteTitle", { defaultValue: "Apagar reunião?" }), description: t("meeting.deleteDesc", { defaultValue: "O programa e o tempo marcado desta reunião serão apagados deste aparelho." }), destructive: true });
    if (!ok) return;
    clearTimer(timerId(p));
    setList((l) => l.filter((x) => x.id !== p.id));
    if (openId === p.id) setOpenId(null);
  };
  const movePart = (p: MeetingProgram, id: string, d: -1 | 1) => patch(p.id, (x) => {
    const i = x.parts.findIndex((q) => q.id === id); const j = i + d;
    if (i < 0 || j < 0 || j >= x.parts.length) return x;
    const parts = [...x.parts]; [parts[i], parts[j]] = [parts[j], parts[i]];
    return { ...x, parts };
  });

  const timerParts = useMemo(() => (prog ? toTimerParts(prog) : []), [prog]);

  if (timing && prog) {
    return (
      <>
        <EventTimerFocus
          ev={{ id: timerId(prog), name: prog.title || t("meeting.title", { defaultValue: "Reunião" }), event_date: prog.date, location: null }}
          parts={timerParts}
          onClose={() => setTiming(false)}
          onEditPart={(id) => { const part = prog.parts.find((x) => x.id === id); if (part) setEditPart({ progId: prog.id, part, isNew: false }); }}
        />
        {editPart && <PartDialog key={editPart.part.id} state={editPart} onClose={() => setEditPart(null)} onSave={(part) => { patch(editPart.progId, (x) => ({ ...x, parts: x.parts.map((q) => (q.id === part.id ? part : q)) })); setEditPart(null); }} />}
      </>
    );
  }

  const body = (
    <div className="fixed inset-0 z-40 flex flex-col bg-background text-foreground" role="dialog" aria-label={t("meeting.title", { defaultValue: "Reunião" })}>
      {/* Barra do topo fixa, estilo iOS/One UI */}
      <header className="flex items-center gap-1 border-b px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {prog ? (
          <Button variant="ghost" className="h-9 gap-0.5 rounded-full px-2" onClick={() => setOpenId(null)}>
            <ChevronLeft className="h-5 w-5" />{t("meeting.weeks", { defaultValue: "Semanas" })}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("common.close", { defaultValue: "Fechar" })} onClick={onClose}><X className="h-5 w-5" /></Button>
        )}
        <p className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold">
          {prog ? (prog.title || fmtDate(prog.date, i18n.language)) : t("meeting.list", { defaultValue: "Reuniões" })}
        </p>
        {prog ? (
          <>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("meeting.rename", { defaultValue: "Renomear reunião" })} onClick={() => void rename(prog)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("common.close", { defaultValue: "Fechar" })} onClick={onClose}><X className="h-5 w-5" /></Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("meeting.new", { defaultValue: "Nova reunião" })} onClick={createBlank}><Plus className="h-5 w-5" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t("common.more", { defaultValue: "Mais" })}><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => void doImport()}><FileUp className="mr-2 h-4 w-4" />{t("meeting.import", { defaultValue: "Importar apostila (.zip/.rtf)" })}</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-3">
        {!prog ? (
          list.length === 0 ? (
            <div className="mx-auto mt-16 max-w-xs space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{t("meeting.empty", { defaultValue: "Nenhuma reunião ainda. Importe a apostila (.zip com várias semanas ou um .rtf) ou crie uma em branco." })}</p>
              <Button className="w-full rounded-full" onClick={() => void doImport()}><FileUp className="mr-2 h-4 w-4" />{t("meeting.import", { defaultValue: "Importar apostila (.zip/.rtf)" })}</Button>
              <Button variant="outline" className="w-full rounded-full" onClick={createBlank}><Plus className="mr-2 h-4 w-4" />{t("meeting.new", { defaultValue: "Nova reunião" })}</Button>
            </div>
          ) : (
            <ul className="mx-auto max-w-xl space-y-2 pb-6">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-1 rounded-2xl border bg-card pl-4">
                  <button type="button" className="min-w-0 flex-1 py-3 text-left" onClick={() => setOpenId(p.id)}>
                    <p className="text-sm font-semibold capitalize">{fmtDate(p.date, i18n.language)} · {p.start}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.title || t("meeting.untitled", { defaultValue: "Sem título" })} · {totalMinutes(p)} min</p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={t("common.more", { defaultValue: "Mais" })}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void rename(p)}><Pencil className="mr-2 h-4 w-4" />{t("meeting.renameShort", { defaultValue: "Renomear" })}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWhenFor(p)}><CalendarDays className="mr-2 h-4 w-4" />{t("meeting.when", { defaultValue: "Mudar data/hora" })}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(p)}><Copy className="mr-2 h-4 w-4" />{t("meeting.duplicate", { defaultValue: "Duplicar" })}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => void remove(p)}><Trash2 className="mr-2 h-4 w-4" />{t("meeting.delete", { defaultValue: "Apagar" })}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="mr-3 h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          )
        ) : (
          <ProgramView prog={prog} lang={i18n.language} onWhen={() => setWhenFor(prog)} onStart={(v) => patch(prog.id, (x) => ({ ...x, start: v }))}
            onEdit={(part) => setEditPart({ progId: prog.id, part, isNew: false })}
            onAdd={() => setEditPart({ progId: prog.id, part: { id: crypto.randomUUID(), theme: "", minutes: 5, section: prog.parts[prog.parts.length - 1]?.section ?? "open", kind: "part", assigned: "" }, isNew: true })}
            onMove={(id, d) => movePart(prog, id, d)} onRun={() => setTiming(true)} />
        )}
      </main>

      {editPart && (
        <PartDialog key={editPart.part.id} state={editPart} onClose={() => setEditPart(null)}
          onDelete={editPart.isNew ? undefined : () => { patch(editPart.progId, (x) => ({ ...x, parts: x.parts.filter((q) => q.id !== editPart.part.id) })); setEditPart(null); }}
          onSave={(part) => { patch(editPart.progId, (x) => ({ ...x, parts: editPart.isNew ? [...x.parts, part] : x.parts.map((q) => (q.id === part.id ? part : q)) })); setEditPart(null); }} />
      )}
      {whenFor && <WhenDialog prog={whenFor} onClose={() => setWhenFor(null)} onSave={(date, start) => { patch(whenFor.id, (x) => ({ ...x, date, start })); setWhenFor(null); }} />}
      {review && (
        <Dialog open onOpenChange={(o) => !o && setReview(null)}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t("meeting.importTitle", { defaultValue: "Importar apostila" })}</DialogTitle>
              <DialogDescription>{t("meeting.importFound", { defaultValue: "{{n}} semana(s) encontrada(s)", n: review.weeks.length })}</DialogDescription>
            </DialogHeader>
            <ul className="divide-y">
              {review.weeks.map((w) => {
                const exists = list.some((p) => p.monday === w.monday);
                const on = review.pick.has(w.monday);
                return (
                  <li key={w.monday}>
                    <label className="flex items-center gap-3 py-2.5">
                      <Checkbox checked={on} onCheckedChange={(v) => setReview((r) => { if (!r) return r; const pick = new Set(r.pick); if (v) pick.add(w.monday); else pick.delete(w.monday); return { ...r, pick }; })} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium capitalize">{fmtDate(w.monday, i18n.language)} · {w.title}</span>
                        <span className="block text-xs text-muted-foreground">{w.parts.length} {t("meeting.parts", { defaultValue: "partes" })} · {totalMinutes(w)} min{exists ? ` · ${t("meeting.exists", { defaultValue: "já existe (marque para substituir)" })}` : ""}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setReview(null)}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
              <Button className="flex-1 rounded-full" disabled={review.pick.size === 0} onClick={applyImport}>{t("meeting.importDo", { defaultValue: "Importar" })}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

function ProgramView({ prog, lang, onWhen, onStart, onEdit, onAdd, onMove, onRun }: {
  prog: MeetingProgram; lang: string; onWhen: () => void; onStart: (v: string) => void; onEdit: (p: MeetingPart) => void; onAdd: () => void; onMove: (id: string, d: -1 | 1) => void; onRun: () => void;
}) {
  const { t } = useTranslation();
  const starts = partStarts(prog);
  let lastSection: MeetingSection | null = null;
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onWhen}>
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-medium capitalize">{fmtDate(prog.date, lang)}</span>
        </button>
        <Label htmlFor="mt-start" className="text-xs text-muted-foreground">{t("meeting.start", { defaultValue: "Início" })}</Label>
        <Input id="mt-start" type="time" value={prog.start} onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && onStart(e.target.value)} className="h-9 w-32 rounded-full" />
      </div>
      {prog.parts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("meeting.noParts", { defaultValue: "Nenhuma parte. Toque em ＋ Parte ou importe a apostila na lista de semanas." })}</p>}
      <ul className="overflow-hidden rounded-2xl border bg-card">
        {prog.parts.map((p, i) => {
          const head = p.section !== lastSection && p.section !== "open" && p.section !== "close" ? p.section : null;
          lastSection = p.section;
          const [k, d] = SECTION_KEYS[p.section];
          return (
            <li key={p.id} className={cn(i > 0 && "border-t")}>
              {head && <p className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground"><span className={cn("h-3 w-1 rounded-full", SECTION_BAR[p.section])} />{t(k, { defaultValue: d })}</p>}
              <div className="flex items-center gap-1 pl-3">
                <button type="button" className="flex min-w-0 flex-1 items-start gap-3 py-2.5 text-left" onClick={() => onEdit(p)}>
                  <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{starts[i]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{p.theme || "—"}</span>
                    {p.assigned && <span className="block truncate text-xs text-muted-foreground">{p.assigned}</span>}
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{p.minutes ?? "–"} min</span>
                </button>
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" className="h-6 w-8" disabled={i === 0} aria-label={t("meeting.up", { defaultValue: "Subir" })} onClick={() => onMove(p.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-8" disabled={i === prog.parts.length - 1} aria-label={t("meeting.down", { defaultValue: "Descer" })} onClick={() => onMove(p.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" className="w-full rounded-full" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{t("meeting.addPart", { defaultValue: "Parte" })}</Button>
      <div className="sticky bottom-0 -mx-4 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <p className="mb-2 text-center text-xs text-muted-foreground">{prog.parts.length} {t("meeting.parts", { defaultValue: "partes" })} · {totalMinutes(prog)} min</p>
        <Button className="h-12 w-full rounded-full text-base" disabled={prog.parts.length === 0} onClick={onRun}><Play className="mr-2 h-5 w-5" />{t("meeting.run", { defaultValue: "Iniciar controle" })}</Button>
      </div>
    </div>
  );
}

function PartDialog({ state, onClose, onSave, onDelete }: { state: { part: MeetingPart; isNew: boolean }; onClose: () => void; onSave: (p: MeetingPart) => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(state.part.theme);
  const [minutes, setMinutes] = useState(state.part.minutes == null ? "" : String(state.part.minutes));
  const [assigned, setAssigned] = useState(state.part.assigned);
  const [section, setSection] = useState<MeetingSection>(state.part.section);
  const save = () => {
    const m = minutes.trim() === "" ? null : Math.max(0, Math.min(180, Math.round(Number(minutes))));
    onSave({ ...state.part, theme: theme.trim().slice(0, 200), minutes: m != null && Number.isFinite(m) ? m : null, assigned: assigned.trim().slice(0, 120), section });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>{state.isNew ? t("meeting.newPart", { defaultValue: "Nova parte" }) : t("meeting.editPart", { defaultValue: "Editar parte" })}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="mp-theme">{t("meeting.theme", { defaultValue: "Tema" })}</Label><Input id="mp-theme" value={theme} onChange={(e) => setTheme(e.target.value)} autoFocus={state.isNew} /></div>
          <div className="flex gap-2">
            <div className="w-24 space-y-1"><Label htmlFor="mp-min">{t("meeting.minutes", { defaultValue: "Minutos" })}</Label><Input id="mp-min" type="number" inputMode="numeric" min={0} max={180} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
            <div className="flex-1 space-y-1"><Label htmlFor="mp-who">{t("meeting.assigned", { defaultValue: "Quem faz" })}</Label><Input id="mp-who" value={assigned} onChange={(e) => setAssigned(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label>{t("meeting.sectionLabel", { defaultValue: "Seção" })}</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SECTION_KEYS) as MeetingSection[]).map((s) => (
                <button key={s} type="button" onClick={() => setSection(s)} className={cn("rounded-full border px-3 py-1 text-xs", section === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                  {t(SECTION_KEYS[s][0], { defaultValue: SECTION_KEYS[s][1] })}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2">
          {onDelete && <Button variant="ghost" className="rounded-full text-destructive" onClick={onDelete}><Trash2 className="mr-1 h-4 w-4" />{t("meeting.delete", { defaultValue: "Apagar" })}</Button>}
          <Button variant="outline" className="flex-1 rounded-full" onClick={onClose}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
          <Button className="flex-1 rounded-full" onClick={save}>{t("common.save", { defaultValue: "Salvar" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WhenDialog({ prog, onClose, onSave }: { prog: MeetingProgram; onClose: () => void; onSave: (date: string, start: string) => void }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(prog.date);
  const [start, setStart] = useState(prog.start);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(start);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>{t("meeting.when", { defaultValue: "Mudar data/hora" })}</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1"><Label htmlFor="mw-date">{t("meeting.date", { defaultValue: "Data" })}</Label><Input id="mw-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="w-32 space-y-1"><Label htmlFor="mw-start">{t("meeting.start", { defaultValue: "Início" })}</Label><Input id="mw-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={onClose}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
          <Button className="flex-1 rounded-full" disabled={!ok} onClick={() => onSave(date, start)}>{t("common.save", { defaultValue: "Salvar" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
