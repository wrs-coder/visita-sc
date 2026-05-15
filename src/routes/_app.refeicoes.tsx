import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Trash2, MapPin, Pencil } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/refeicoes")({ component: Page });

const MEAL = { breakfast: "Café", lunch: "Almoço", dinner: "Jantar" };
type MealKey = keyof typeof MEAL;
interface Meal { id: string; visit_id: string; meal_date: string; type: MealKey; host_name: string; location: string | null; meal_time: string | null; notes: string | null; is_active: boolean; }

function Page() {
  const { visit } = useActiveVisit();
  const { role } = useAuth();
  const canEdit = role === "superintendent";
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

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;
  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  const save = async () => {
    if (!editing?.host_name || !editing.meal_date || !editing.type) { toast.error("Preencha os dados"); return; }
    const payload = { visit_id: visit.id, meal_date: editing.meal_date, type: editing.type, host_name: editing.host_name, location: editing.location || null, meal_time: editing.meal_time || null, notes: editing.notes || null };
    const r = editing.id ? await supabase.from("meals").update(payload).eq("id", editing.id) : await supabase.from("meals").insert(payload);
    if (r.error) toast.error(r.error.message); else { toast.success("Salvo"); setOpen(false); setEditing(null); }
  };

  const remove = async (id: string) => { const { error } = await supabase.from("meals").delete().eq("id", id); if (error) toast.error(error.message); };

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
                  <div><Label>Anfitrião</Label><Input className="mt-1" value={editing.host_name ?? ""} onChange={(e) => setEditing({ ...editing, host_name: e.target.value })} /></div>
                  <div><Label>Local</Label><Input className="mt-1" value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
                  <div><Label>Horário</Label><Input type="time" className="mt-1" value={editing.meal_time ?? ""} onChange={(e) => setEditing({ ...editing, meal_time: e.target.value })} /></div>
                  <Button className="w-full" onClick={save}>Salvar</Button>
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
                    <Card key={m.id} className="shadow-card"><CardContent className="p-4 flex items-start gap-3">
                      <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[64px] text-center">{MEAL[m.type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{m.host_name}</div>
                        {m.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</div>}
                        {m.meal_time && <div className="text-xs text-muted-foreground">{m.meal_time.slice(0, 5)}</div>}
                      </div>
                      {canEdit && <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
