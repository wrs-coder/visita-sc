import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, ListChecks, MapPin, Clock, ChevronRight, UtensilsCrossed } from "lucide-react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PwaInstallButton } from "@/components/PwaInstall";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

interface ScheduleEvent { id: string; event_date: string; start_time: string | null; title: string; location: string | null; type: string; }
interface ChecklistItem { id: string; status: string; }
interface Meal { id: string; meal_date: string; type: string; host_name: string | null; location: string | null; }

function Dashboard() {
  const { profile, role } = useAuth();
  const { visit } = useActiveVisit();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!visit) return;
    const fetchAll = async () => {
      const [{ data: e }, { data: c }, { data: m }] = await Promise.all([
        supabase.from("schedule_events").select("id, event_date, start_time, title, location, type").eq("visit_id", visit.id).order("event_date").order("start_time"),
        supabase.from("checklist_items").select("id, status").eq("visit_id", visit.id),
        supabase.from("meals").select("id, meal_date, type, host_name, location").eq("visit_id", visit.id).eq("meal_date", today),
      ]);
      setEvents(e ?? []);
      setChecklist(c ?? []);
      setMeals(m ?? []);
    };
    fetchAll();
    const ch = supabase.channel(`dash-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items", filter: `visit_id=eq.${visit.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_events", filter: `visit_id=eq.${visit.id}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit, today]);

  const todayEvents = events.filter((e) => e.event_date === today);
  const doneCount = checklist.filter((c) => c.status === "done").length;
  const total = checklist.length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PwaInstallButton />
      <header>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Olá, {profile?.full_name?.split(" ")[0] ?? "irmão"}!</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {role === "superintendent" ? "Painel do Superintendente" : "Painel do Ancião"}
          {visit ? ` · Visita: ${visit.title}` : " · Nenhuma visita ativa"}
        </p>
      </header>

      {!visit && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Nenhuma visita ativa.{" "}
              {role === "superintendent" ? <Link to="/configuracoes" className="text-primary font-medium hover:underline">Cadastre uma nova visita</Link> : "Aguarde o superintendente cadastrar."}
            </p>
          </CardContent>
        </Card>
      )}

      {visit && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /><h3 className="font-semibold">Checklist da Congregação</h3></div>
                <Link to="/checklist" className="text-primary text-xs font-medium inline-flex items-center hover:underline">Ver tudo <ChevronRight className="h-3 w-3" /></Link>
              </div>
              <div className="flex items-end justify-between mb-2">
                <div><div className="text-3xl font-bold">{progress}%</div><div className="text-xs text-muted-foreground">{doneCount} de {total} concluídos</div></div>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-primary" /><h3 className="font-semibold">Refeições de hoje</h3></div>
                <Link to="/refeicoes" className="text-primary text-xs font-medium inline-flex items-center hover:underline">Ver tudo <ChevronRight className="h-3 w-3" /></Link>
              </div>
              {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada agendado para hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {meals.map((m) => (
                    <li key={m.id} className="text-sm flex items-start gap-2">
                      <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs">
                        {m.type === "lunch" ? "Almoço" : m.type === "dinner" ? "Jantar" : "Café"}
                      </span>
                      <div><div className="font-medium">{m.host_name}</div>{m.location && <div className="text-xs text-muted-foreground">{m.location}</div>}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {visit && (
        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h3 className="font-semibold">Programação de hoje</h3></div>
              <Link to="/cronograma" className="text-primary text-xs font-medium inline-flex items-center hover:underline">Cronograma completo <ChevronRight className="h-3 w-3" /></Link>
            </div>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum compromisso registrado para hoje.</p>
            ) : (
              <ul className="space-y-3">
                {todayEvents.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[58px] text-center">
                      <Clock className="inline h-3 w-3 mr-0.5" />{e.start_time?.slice(0, 5) ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
