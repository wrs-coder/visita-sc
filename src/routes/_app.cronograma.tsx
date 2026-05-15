import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, MapPin, Trash2, Pencil, Save } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cronograma")({ component: Page });

const TYPES = {
  field_morning: "Reunião de Campo (Manhã)",
  field_afternoon: "Reunião de Campo (Tarde)",
  elders_meeting: "Corpo de Anciãos",
  pioneers_meeting: "Reunião com Pioneiros",
  midweek_meeting: "Reunião do Meio de Semana",
  weekend_meeting: "Reunião do Fim de Semana",
  other: "Outro",
};

interface Event { id: string; visit_id: string; event_date: string; start_time: string | null; end_time: string | null; type: keyof typeof TYPES; title: string; location: string | null; notes: string | null; }

function Page() {
  const { visit } = useActiveVisit();
  const { role } = useAuth();
  const canEdit = role === "superintendent";
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase.from("schedule_events").select("*").eq("visit_id", visit.id).order("event_date").order("start_time");
      setEvents((data ?? []) as Event[]);
    };
    load();
    const ch = supabase.channel(`sched-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_events", filter: `visit_id=eq.${visit.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  if (!visit) return <Empty />;

  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  const save = async () => {
    if (!editing || !editing.title || !editing.event_date) { toast.error("Preencha título e data"); return; }
    setSaving(true);
    const payload = {
      visit_id: visit.id,
      event_date: editing.event_date,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
      type: editing.type ?? "other",
      title: editing.title,
      location: editing.location || null,
      notes: editing.notes || null,
    };
    const res = editing.id
      ? await supabase.from("schedule_events").update(payload).eq("id", editing.id)
      : await supabase.from("schedule_events").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo");
    setOpen(false); setEditing(null);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("schedule_events").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Removido");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Cronograma Semanal</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(parseISO(visit.start_date), "d MMM", { locale: ptBR })} – {format(parseISO(visit.end_date), "d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ event_date: format(new Date(), "yyyy-MM-dd"), type: "other" })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </DialogTrigger>
            <EventDialog editing={editing} setEditing={setEditing} save={save} saving={saving} days={days} />
          </Dialog>
        )}
      </div>

      <div className="space-y-6">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = events.filter((e) => e.event_date === key);
          return (
            <section key={key}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{format(day, "EEEE, d 'de' MMM", { locale: ptBR })}</h2>
              {dayEvents.length === 0 ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem compromissos.</CardContent></Card>
              ) : (
                <div className="grid gap-2">
                  {dayEvents.map((e) => (
                    <Card key={e.id} className="shadow-card">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[64px] text-center">
                          <Clock className="inline h-3 w-3 mr-0.5" />{e.start_time?.slice(0, 5) ?? "—"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-primary/70">{TYPES[e.type]}</div>
                          <div className="font-semibold">{e.title}</div>
                          {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{e.location}</div>}
                          {e.notes && <div className="text-xs mt-1 text-muted-foreground">{e.notes}</div>}
                        </div>
                        {canEdit && (
                          <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function EventDialog({ editing, setEditing, save, saving, days }: { editing: Partial<Event> | null; setEditing: (e: Partial<Event> | null) => void; save: () => void; saving: boolean; days: Date[] }) {
  if (!editing) return null;
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{editing.id ? "Editar" : "Novo"} compromisso</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Tipo</Label>
          <Select value={editing.type ?? "other"} onValueChange={(v) => setEditing({ ...editing, type: v as keyof typeof TYPES })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Título</Label>
          <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Data</Label>
            <Select value={editing.event_date} onValueChange={(v) => setEditing({ ...editing, event_date: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{days.map((d) => { const k = format(d, "yyyy-MM-dd"); return <SelectItem key={k} value={k}>{format(d, "EEE, d MMM", { locale: ptBR })}</SelectItem>; })}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Horário início</Label>
            <Input type="time" value={editing.start_time ?? ""} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5"><Label>Local</Label>
          <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
        </div>
        <div className="space-y-1.5"><Label>Observações</Label>
          <Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
        </div>
        <Button className="w-full" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar"}</Button>
      </div>
    </DialogContent>
  );
}

function Empty() { return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa. Cadastre uma em Configurações.</CardContent></Card>; }
