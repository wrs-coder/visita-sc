import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/refeicoes")({ component: Page });

const MEAL_LABEL = { breakfast: "Café", lunch: "Almoço", dinner: "Jantar" } as const;
type MealKey = keyof typeof MEAL_LABEL;

interface Meal {
  id: string;
  visit_id: string;
  meal_date: string;
  type: MealKey;
  host_name: string | null;
  location: string | null;
  contact_phone: string | null;
  meal_time: string | null;
  notes: string | null;
  is_active: boolean;
}

function Page() {
  const { visit } = useActiveVisit();
  const { role } = useAuth();
  const isSuper = role === "superintendent";
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const [{ data }, { data: notes }] = await Promise.all([
        supabase.from("meals").select("*").eq("visit_id", visit.id).order("meal_date").order("type"),
        supabase.from("meal_day_notes").select("meal_date,notes").eq("visit_id", visit.id),
      ]);
      setMeals((data ?? []) as Meal[]);
      const map: Record<string, string> = {};
      for (const n of (notes ?? []) as Array<{ meal_date: string; notes: string }>) map[n.meal_date] = n.notes;
      setDayNotes(map);
    };
    load();
    const ch = supabase.channel(`m-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meals", filter: `visit_id=eq.${visit.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_day_notes", filter: `visit_id=eq.${visit.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  const saveDayNote = useCallback(async (date: string, notes: string) => {
    if (!visit) return;
    const { error } = await supabase.from("meal_day_notes").upsert(
      { visit_id: visit.id, meal_date: date, notes },
      { onConflict: "visit_id,meal_date" },
    );
    if (error) toast.error(error.message);
  }, [visit]);

  const update = useCallback(async (id: string, patch: Partial<Meal>) => {
    setSavingId(id);
    setMeals((s) => s.map((x) => x.id === id ? { ...x, ...patch } : x));
    const { error } = await supabase.from("meals").update(patch).eq("id", id);
    setSavingId(null);
    if (error) toast.error(error.message);
  }, []);

  const add = async (date: string, type: MealKey) => {
    if (!visit) return;
    const { error } = await supabase.from("meals").insert({ visit_id: visit.id, meal_date: date, type });
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;
  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Logística e Refeições</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuper
            ? "Defina as refeições disponíveis por dia. Anciãos preenchem anfitrião, endereço e telefone. Itens desativados ficam ocultos para a congregação."
            : "Edite anfitrião, endereço e telefone de contato das refeições disponíveis."}
        </p>
      </div>

      <div className="space-y-5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayMeals = meals.filter((m) => m.meal_date === key);
          const dayNote = dayNotes[key] ?? "";
          return (
            <section key={key}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{format(d, "EEEE, d MMM", { locale: ptBR })}</h2>
                {isSuper && (
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => add(key, "breakfast")}><Plus className="h-3 w-3 mr-1" />Café</Button>
                    <Button size="sm" variant="outline" onClick={() => add(key, "lunch")}><Plus className="h-3 w-3 mr-1" />Almoço</Button>
                    <Button size="sm" variant="outline" onClick={() => add(key, "dinner")}><Plus className="h-3 w-3 mr-1" />Jantar</Button>
                  </div>
                )}
              </div>
              <DayNoteEditor mealDate={key} value={dayNote} isSuper={isSuper} onChange={(v) => setDayNotes((s) => ({ ...s, [key]: v }))} onSave={(v) => saveDayNote(key, v)} />
              {dayMeals.length === 0 ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem refeições disponíveis.</CardContent></Card>
              ) : (
                dayMeals.map((m) => (
                  <MealCard key={m.id} meal={m} isSuper={isSuper} saving={savingId === m.id} update={update} remove={remove} />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MealCard({ meal: m, isSuper, saving, update, remove }: { meal: Meal; isSuper: boolean; saving: boolean; update: (id: string, p: Partial<Meal>) => Promise<void>; remove: (id: string) => void }) {
  const [host_name, setHostName] = useState(m.host_name ?? "");
  const [location, setLocation] = useState(m.location ?? "");
  const [contact_phone, setContactPhone] = useState(m.contact_phone ?? "");
  const [meal_time, setMealTime] = useState(m.meal_time ?? "");

  useEffect(() => {
    setHostName(m.host_name ?? "");
    setLocation(m.location ?? "");
    setContactPhone(m.contact_phone ?? "");
    setMealTime(m.meal_time ?? "");
  }, [m.id, m.host_name, m.location, m.contact_phone, m.meal_time]);

  const dirty =
    host_name !== (m.host_name ?? "") ||
    location !== (m.location ?? "") ||
    contact_phone !== (m.contact_phone ?? "") ||
    meal_time !== (m.meal_time ?? "");

  const everSaved = !!(m.host_name || m.location || m.contact_phone);

  const handleSave = () => {
    if (!dirty) return;
    update(m.id, {
      host_name: host_name.trim() || null,
      location: location.trim() || null,
      contact_phone: contact_phone.trim() || null,
      meal_time: meal_time || null,
    });
  };

  return (
    <Card className={`shadow-card mb-2 transition ${!m.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`text-xs font-semibold px-2 py-1 rounded ${m.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>
            {MEAL_LABEL[m.type]}
            {!m.is_active && " · desativado"}
          </div>
          <div className="flex items-center gap-2">
            {isSuper && <Switch checked={m.is_active} onCheckedChange={(v) => update(m.id, { is_active: v })} aria-label="Ativar/desativar" />}
            {isSuper && (
              <Button size="icon" variant="ghost" onClick={() => remove(m.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Nome do anfitrião</label>
            <Input value={host_name} onChange={(e) => setHostName(e.target.value)} className="h-9 mt-0.5" />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Endereço</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Rua, número, bairro" className="h-9 mt-0.5" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Telefone</label>
            <Input type="tel" value={contact_phone} onChange={(e) => setContactPhone(e.target.value)} className="h-9 mt-0.5" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Horário</label>
            <Input type="time" value={meal_time} onChange={(e) => setMealTime(e.target.value)} disabled={!isSuper} className="h-9 mt-0.5" />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {everSaved ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
