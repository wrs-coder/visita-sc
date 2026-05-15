import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, MapPin, Pencil, Phone, AlertCircle } from "lucide-react";
import { format, parseISO, eachDayOfInterval, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/refeicoes")({ component: Page });

const MEAL = { breakfast: "Café", lunch: "Almoço", dinner: "Jantar" };
type MealKey = keyof typeof MEAL;
interface Meal { id: string; visit_id: string; meal_date: string; type: MealKey; host_name: string; location: string | null; contact_phone: string | null; meal_time: string | null; notes: string | null; is_active: boolean; }

function Page() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const isSuper = role === "superintendent";
  const [meals, setMeals] = useState<Meal[]>([]);
  const [editing, setEditing] = useState<Partial<Meal> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase.from("meals").select("*").eq("visit_id", visit.id).order("meal_date").order("type");
      setMeals((data ?? []) as Meal[]);
    };
    load();
    const ch = supabase.channel(`m-${visit.id}`).on("postgres_changes", { event: "*", schema: "public", table: "meals", filter: `visit_id=eq.${visit.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  const isWeekend = useMemo(() => {
    if (!editing?.meal_date) return false;
    const d = getDay(parseISO(editing.meal_date));
    return d === 0 || d === 6;
  }, [editing?.meal_date]);

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;
  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  const save = async () => {
    if (!editing?.host_name?.trim() || !editing.meal_date || !editing.type) { toast.error("Anfitrião, data e tipo são obrigatórios"); return; }
    if (!editing.location?.trim()) { toast.error("Endereço do anfitrião é obrigatório"); return; }
    if (!editing.contact_phone?.trim()) { toast.error("Telefone do anfitrião é obrigatório"); return; }
    const payload = { visit_id: visit.id, meal_date: editing.meal_date, type: editing.type, host_name: editing.host_name.trim(), location: editing.location.trim(), contact_phone: editing.contact_phone.trim(), meal_time: editing.meal_time || null, notes: editing.notes || null };
    const r = editing.id ? await supabase.from("meals").update(payload).eq("id", editing.id) : await supabase.from("meals").insert(payload);
    if (r.error) toast.error(r.error.message); else { toast.success(editing.id ? "Alterações salvas" : "Salvo"); setOpen(false); setEditing(null); }
  };

  const remove = async (id: string) => { const { error } = await supabase.from("meals").delete().eq("id", id); if (error) toast.error(error.message); };
  const toggle = async (id: string, is_active: boolean) => { const { error } = await supabase.from("meals").update({ is_active }).eq("id", id); if (error) toast.error(error.message); };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl md:text-3xl font-bold">Logística e Refeições</h1><p className="text-sm text-muted-foreground mt-1">Anfitriões e locais por dia.</p></div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing({ meal_date: format(new Date(), "yyyy-MM-dd"), type: "lunch" })}><Plus className="h-4 w-4 mr-1" />Nova</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} refeição</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Data</Label>
                      <Select value={editing.meal_date} onValueChange={(v) => setEditing({ ...editing, meal_date: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{days.map((d) => { const k = format(d, "yyyy-MM-dd"); return <SelectItem key={k} value={k}>{format(d, "EEE, d MMM", { locale: ptBR })}</SelectItem>; })}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tipo</Label>
                      <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as MealKey })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(MEAL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isWeekend && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Lembrete: Se a reunião é entre 7:00 e às 16:30 não marquem almoço.</span>
                    </div>
                  )}

                  <div><Label>Anfitrião <span className="text-destructive">*</span></Label><Input className="mt-1" required value={editing.host_name ?? ""} onChange={(e) => setEditing({ ...editing, host_name: e.target.value })} /></div>
                  <div><Label>Endereço <span className="text-destructive">*</span></Label><Input className="mt-1" required value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Rua, número, bairro" /></div>
                  <div><Label>Telefone do anfitrião <span className="text-destructive">*</span></Label><Input type="tel" className="mt-1" required value={editing.contact_phone ?? ""} onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })} /></div>
                  <div><Label>Horário</Label><Input type="time" className="mt-1" value={editing.meal_time ?? ""} onChange={(e) => setEditing({ ...editing, meal_time: e.target.value })} /></div>
                  <Button className="w-full" onClick={save}>{editing.id ? "Salvar alterações" : "Salvar"}</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dm = meals.filter((m) => m.meal_date === key);
          return (
            <section key={key}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{format(d, "EEEE, d MMM", { locale: ptBR })}</h2>
              {dm.length === 0 ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem refeições.</CardContent></Card> :
                <div className="grid gap-2">
                  {dm.map((m) => (
                    <Card key={m.id} className={`shadow-card transition ${!m.is_active ? "opacity-50" : ""}`}><CardContent className="p-4 flex items-start gap-3">
                      <div className={`text-xs font-semibold px-2 py-1 rounded min-w-[64px] text-center ${m.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>{MEAL[m.type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold ${!m.is_active ? "line-through" : ""}`}>{m.host_name}</div>
                        {m.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</div>}
                        {m.contact_phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{m.contact_phone}</div>}
                        {m.meal_time && <div className="text-xs text-muted-foreground">{m.meal_time.slice(0, 5)}</div>}
                      </div>
                      {canEdit && <div className="flex flex-col items-end gap-1">
                        {isSuper && <Switch checked={m.is_active} onCheckedChange={(v) => toggle(m.id, v)} aria-label="Ativar/desativar" />}
                        <div className="flex">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isSuper && <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                        </div>
                      </div>}
                    </CardContent></Card>
                  ))}
                </div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
