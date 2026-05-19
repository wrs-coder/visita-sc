import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { getActiveCongregationOverride, setActiveCongregationOverride } from "@/hooks/use-active-congregation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Clock, MapPin, Trash2, Pencil, Save, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format, parseISO, eachDayOfInterval, startOfWeek, addDays, addWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { offlineUpdate, offlineInsert, offlineDelete } from "@/lib/offline-supabase";

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

interface Event { id: string; visit_id: string; event_date: string; start_time: string | null; end_time: string | null; type: keyof typeof TYPES; title: string; location: string | null; notes: string | null; is_active: boolean; }

function Page() {
  const { visit } = useActiveVisit();
  const { role, user } = useAuth();
  const canEdit = role === "superintendent";
  const [events, setEvents] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calOpen, setCalOpen] = useState(false);

  // Auto-detecta a congregação da semana corrente para o superintendente,
  // cruzando a data de hoje com o intervalo de cada visita cadastrada (Itinerário).
  // A lógica interna do cronograma (escalas, dias, campos) permanece intacta.
  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    let cancelled = false;
    (async () => {
      const { data: congs } = await supabase
        .from("congregations").select("id").eq("superintendent_id", user.id);
      const ids = (congs ?? []).map((c) => c.id);
      if (!ids.length || cancelled) return;
      const { data: vs } = await supabase
        .from("visits").select("congregation_id,start_date,end_date")
        .in("congregation_id", ids)
        .lte("start_date", today).gte("end_date", today)
        .order("is_active", { ascending: false })
        .limit(1);
      const target = vs?.[0]?.congregation_id;
      if (!cancelled && target && getActiveCongregationOverride() !== target) {
        setActiveCongregationOverride(target);
      }
    })();
    return () => { cancelled = true; };
  }, [role, user?.id]);

  useEffect(() => {
    if (!visit) return;
    setWeekStart(startOfWeek(parseISO(visit.start_date), { weekStartsOn: 1 }));
  }, [visit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) setWeekStart((w) => addWeeks(w, 1));
    else setWeekStart((w) => addWeeks(w, -1));
  };

  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }), [weekStart]);

  if (!visit) return <Empty />;

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
      ? await offlineUpdate("schedule_events", payload, { id: editing.id })
      : await offlineInsert("schedule_events", payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(res.queued ? "Salvo offline" : "Salvo");
    setOpen(false); setEditing(null);
  };

  const remove = async (id: string) => {
    const { error } = await offlineDelete("schedule_events", { id });
    if (error) toast.error(error.message); else toast.success("Removido");
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await offlineUpdate("schedule_events", { is_active }, { id });
    if (error) toast.error(error.message);
  };

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Cronograma Semanal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "d 'de' MMM", { locale: ptBR })} – {format(weekEnd, "d 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Escolher semana"><CalendarIcon className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={weekStart}
                onSelect={(d) => { if (d) { setWeekStart(startOfWeek(d, { weekStartsOn: 1 })); setCalOpen(false); } }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          {canEdit && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing({ event_date: format(new Date(), "yyyy-MM-dd"), type: "other" })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
              </DialogTrigger>
              <EventDialog editing={editing} setEditing={setEditing} save={save} saving={saving} days={days} />
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
          <ChevronLeft className="h-4 w-4 mr-1" />Semana anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Esta semana
        </Button>
        <Button size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          Próxima semana<ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-6 select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = events.filter((e) => e.event_date === key);
          const todayMark = isSameDay(day, new Date());
          return (
            <section key={key}>
              <h2 className={cn("text-sm font-semibold uppercase tracking-wide mb-2", todayMark ? "text-primary" : "text-muted-foreground")}>
                {format(day, "EEEE, d 'de' MMM", { locale: ptBR })}{todayMark && " · hoje"}
              </h2>
              {dayEvents.length === 0 ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem compromissos.</CardContent></Card>
              ) : (
                <div className="grid gap-2">
                  {dayEvents.map((e) => (
                    <Card key={e.id} className={`shadow-card transition ${!e.is_active ? "opacity-50" : ""}`}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[64px] text-center">
                          <Clock className="inline h-3 w-3 mr-0.5" />{e.start_time?.slice(0, 5) ?? "—"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium uppercase tracking-wide text-primary/70">{TYPES[e.type]}</div>
                          <div className={`font-semibold ${!e.is_active ? "line-through" : ""}`}>{e.title}</div>
                          {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{e.location}</div>}
                          {e.notes && <div className="text-xs mt-1 text-muted-foreground">{e.notes}</div>}
                        </div>
                        {canEdit && (
                          <div className="flex flex-col items-end gap-1">
                            <Switch checked={e.is_active} onCheckedChange={(v) => toggle(e.id, v)} aria-label="Ativar/desativar" />
                            <div className="flex">
                              <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
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

function Empty() { return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa. Cadastre uma em Itinerário.</CardContent></Card>; }
