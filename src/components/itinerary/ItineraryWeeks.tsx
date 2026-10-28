import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarOff, PenLine, Plus, Sun, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildCustomNotes, isExpiredFreeWeek, parseCustomType, suggestFreeWeeks, weekEndFor, type VisitLike,
} from "@/lib/itinerary-weeks";

type WeekType = "pioneer" | "free" | "other";
interface Week { id: string; week_type: "pioneer" | "free"; start_date: string; end_date: string; notes: string | null }

const LABEL: Record<WeekType, string> = { pioneer: "Semana de pioneiro", free: "Semana livre", other: "Outro" };

type Row =
  | { kind: "week"; key: string; start: string; week: Week }
  | { kind: "suggest"; key: string; start: string; end: string };

/** Semanas do itinerário sem congregação (só o superintendente vê e edita). */
export function ItineraryWeeks({ visits = [] }: { visits?: VisitLike[] }) {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<WeekType>("pioneer");
  const [customName, setCustomName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("itinerary_weeks").select("id,week_type,start_date,end_date,notes").order("start_date");
    const list = (data ?? []) as Week[];
    const expired = list.filter((w) => isExpiredFreeWeek(w, new Date()));
    if (expired.length) {
      await supabase.from("itinerary_weeks").delete().in("id", expired.map((w) => w.id));
    }
    setWeeks(list.filter((w) => !expired.includes(w)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo<Row[]>(() => {
    const r: Row[] = weeks.map((w) => ({ kind: "week", key: w.id, start: w.start_date, week: w }));
    for (const s of suggestFreeWeeks(visits, weeks, new Date())) r.push({ kind: "suggest", key: "s" + s.start, start: s.start, end: s.end });
    return r.sort((a, b) => a.start.localeCompare(b.start));
  }, [weeks, visits]);

  const openNew = (s = "", e = "") => {
    setType("pioneer"); setCustomName(""); setNotes(""); setStart(s); setEnd(e); setOpen(true);
  };

  const save = async () => {
    if (!start || !end || end < start) { toast.error("Confira as datas."); return; }
    if (type === "other" && !customName.trim()) { toast.error("Escreva o tipo da semana."); return; }
    setBusy(true);
    const { error } = await supabase.from("itinerary_weeks").insert({
      week_type: type === "pioneer" ? "pioneer" : "free",
      start_date: start, end_date: end,
      notes: type === "other" ? buildCustomNotes(customName, notes) : notes.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar a semana."); return; }
    toast.success("Semana adicionada.");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("itinerary_weeks").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    load();
  };

  const range = (s: string, e: string) =>
    `${format(parseISO(s), "d MMM", { locale: ptBR })} – ${format(parseISO(e), "d MMM yyyy", { locale: ptBR })}`;

  let lastMonth = "";
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarOff className="h-4 w-4" /> Semanas sem visita</h2>
        <Button variant="outline" onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" />Semana</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">Nenhuma semana de pioneiro ou livre cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const month = row.start.slice(0, 7);
            const header = month !== lastMonth;
            lastMonth = month;
            return (
              <div key={row.key} className="space-y-2">
                {header && (
                  <div className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(parseISO(month + "-01"), "MMMM yyyy", { locale: ptBR })}
                  </div>
                )}
                {row.kind === "suggest" ? (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2">
                    <span className="text-xs text-muted-foreground">Sem visita</span>
                    <span className="flex-1 text-sm text-muted-foreground">{range(row.start, row.end)}</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={() => openNew(row.start, row.end)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Criar
                    </Button>
                  </div>
                ) : (() => {
                  const w = row.week;
                  const custom = parseCustomType(w.notes);
                  return (
                    <Card className="shadow-card">
                      <CardContent className="p-3 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shrink-0">
                          {custom.name ? <PenLine className="h-3 w-3" /> : w.week_type === "pioneer" ? <Sun className="h-3 w-3" /> : <CalendarOff className="h-3 w-3" />}
                          {custom.name ?? LABEL[w.week_type]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{range(w.start_date, w.end_date)}</div>
                          {custom.rest && <div className="text-xs text-muted-foreground truncate">{custom.rest}</div>}
                        </div>
                        <Button size="icon" variant="ghost" aria-label="Excluir semana" onClick={() => remove(w.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova semana sem visita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as WeekType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pioneer">{LABEL.pioneer}</SelectItem>
                  <SelectItem value="free">{LABEL.free}</SelectItem>
                  <SelectItem value="other">Outro tipo…</SelectItem>
                </SelectContent>
              </Select>
              {type === "other" && (
                <Input className="mt-2" autoFocus placeholder="Ex.: Assembleia, Férias" maxLength={60}
                  value={customName} onChange={(e) => setCustomName(e.target.value)} />
              )}
              {type === "free" && (
                <p className="mt-1 text-xs text-muted-foreground">Some sozinha na segunda-feira após o fim.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input className="mt-1" type="date" value={start} onChange={(e) => {
                  const v = e.target.value; setStart(v);
                  if (v) setEnd(weekEndFor(v));
                }} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input className="mt-1" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input className="mt-1" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Nenhuma congregação é ligada a esta semana.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
