import { useCallback, useEffect, useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarOff, Plus, Sun, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WeekType = "pioneer" | "free";
interface Week { id: string; week_type: WeekType; start_date: string; end_date: string; notes: string | null }

const LABEL: Record<WeekType, string> = { pioneer: "Semana de pioneiro", free: "Semana livre" };

/** Semanas do itinerário sem congregação (só o superintendente vê e edita). */
export function ItineraryWeeks() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<WeekType>("pioneer");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("itinerary_weeks").select("id,week_type,start_date,end_date,notes").order("start_date");
    setWeeks((data ?? []) as Week[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!start || !end || end < start) { toast.error("Confira as datas."); return; }
    setBusy(true);
    const { error } = await supabase.from("itinerary_weeks").insert({ week_type: type, start_date: start, end_date: end, notes: notes.trim() || null });
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar a semana."); return; }
    toast.success("Semana adicionada.");
    setOpen(false); setStart(""); setEnd(""); setNotes("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("itinerary_weeks").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    load();
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarOff className="h-4 w-4" /> Semanas sem visita</h2>
        <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Semana</Button>
      </div>
      {weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">Nenhuma semana de pioneiro ou livre cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {weeks.map((w) => (
            <Card key={w.id} className="shadow-card">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shrink-0">
                  {w.week_type === "pioneer" ? <Sun className="h-3 w-3" /> : <CalendarOff className="h-3 w-3" />}
                  {LABEL[w.week_type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {format(parseISO(w.start_date), "d MMM", { locale: ptBR })} – {format(parseISO(w.end_date), "d MMM yyyy", { locale: ptBR })}
                  </div>
                  {w.notes && <div className="text-xs text-muted-foreground truncate">{w.notes}</div>}
                </div>
                <Button size="icon" variant="ghost" aria-label="Excluir semana" onClick={() => remove(w.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
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
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input className="mt-1" type="date" value={start} onChange={(e) => {
                  const v = e.target.value; setStart(v);
                  if (v && !end) setEnd(format(addDays(parseISO(v), 6), "yyyy-MM-dd"));
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
