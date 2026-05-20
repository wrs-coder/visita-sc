import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ListChecks, MapPin, Clock, ChevronRight, UtensilsCrossed, Building2, Car, BookOpen, Users } from "lucide-react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useActiveCongregation, getActiveCongregationOverride, setActiveCongregationOverride } from "@/hooks/use-active-congregation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PwaInstallButton } from "@/components/PwaInstall";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

interface ScheduleEvent { id: string; event_date: string; start_time: string | null; title: string; location: string | null; type: string; }
interface ChecklistItem { id: string; status: string; }
interface Meal { id: string; meal_date: string; type: string; host_name: string | null; location: string | null; }
interface Transport { id: string; driver_name: string; contact_phone: string | null; description: string | null; notes: string | null; }
interface FieldAssignment { id: string; period: string; meeting_point: string | null; meeting_time: string | null; acompanhante: string | null; acompanhante_for: string | null; contact_phone: string | null; notes: string | null; }
interface FieldMeetingToday { id: string; period: string; modality: string; meeting_time: string | null; meeting_location: string | null; territory_number: string | null; territory_location: string | null; auxiliary_leaders: string | null; }

const MODALITY_LABEL: Record<string, string> = {
  casa_em_casa: "Casa em Casa",
  cartas: "Cartas",
  telefone: "Telefone",
  testemunho_publico: "Testemunho Público",
  revisitas: "Revisitas",
  estudos: "Estudos Bíblicos",
};

function Dashboard() {
  const { profile, role, user } = useAuth();
  const activeCong = useActiveCongregation();
  const { visit } = useActiveVisit();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [fieldMeetings, setFieldMeetings] = useState<FieldMeetingToday[]>([]);
  const [congs, setCongs] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string | null>(() => getActiveCongregationOverride());
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    supabase.from("congregations").select("id,name").eq("superintendent_id", user.id).order("name").then(({ data }) => {
      setCongs(data ?? []);
    });
  }, [role, user]);

  useEffect(() => {
    if (role !== "superintendent") return;
    if (!selected && activeCong) setSelected(activeCong.id);
  }, [role, activeCong, selected]);

  const handleSelectCong = (id: string) => {
    setSelected(id);
    setActiveCongregationOverride(id);
  };

  useEffect(() => {
    if (!visit) return;
    const fetchAll = async () => {
      const [{ data: e }, { data: c }, { data: m }, { data: t }, { data: a }, { data: fm }] = await Promise.all([
        supabase.from("schedule_events").select("id, event_date, start_time, title, location, type").eq("visit_id", visit.id).order("event_date").order("start_time"),
        supabase.from("checklist_items").select("id, status").eq("visit_id", visit.id),
        supabase.from("meals").select("id, meal_date, type, host_name, location").eq("visit_id", visit.id).eq("meal_date", today),
        supabase.from("transport_schedule").select("id, driver_name, contact_phone, description, notes").eq("visit_id", visit.id).eq("event_date", today).eq("is_active", true),
        supabase.from("field_assignments").select("id, period, meeting_point, meeting_time, acompanhante, acompanhante_for, contact_phone, notes").eq("visit_id", visit.id).eq("event_date", today).eq("is_active", true).order("period"),
        supabase.from("field_meetings").select("id, period, modality, meeting_time, meeting_location, territory_number, territory_location, auxiliary_leaders").eq("visit_id", visit.id).eq("event_date", today).eq("is_active", true).order("period"),
      ]);
      setEvents(e ?? []);
      setChecklist(c ?? []);
      setMeals(m ?? []);
      setTransports((t ?? []) as Transport[]);
      setAssignments((a ?? []) as FieldAssignment[]);
      setFieldMeetings((fm ?? []) as FieldMeetingToday[]);
    };
    fetchAll();
    const ch = supabase.channel(`dash-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items", filter: `visit_id=eq.${visit.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_events", filter: `visit_id=eq.${visit.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_schedule", filter: `visit_id=eq.${visit.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_assignments", filter: `visit_id=eq.${visit.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_meetings", filter: `visit_id=eq.${visit.id}` }, fetchAll)
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

      {role === "superintendent" && congs.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Congregação ativa</div>
              <div className="text-xs text-muted-foreground">Selecione a congregação do circuito para ver e gerenciar seus dados.</div>
            </div>
            <Select value={selected ?? activeCong?.id ?? ""} onValueChange={handleSelectCong}>
              <SelectTrigger className="w-[200px] max-w-[60vw]"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {congs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

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
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Car className="h-4 w-4 text-primary" /><h3 className="font-semibold">Transporte do dia</h3></div>
                <Link to="/transporte" className="text-primary text-xs font-medium inline-flex items-center hover:underline">Ver tudo <ChevronRight className="h-3 w-3" /></Link>
              </div>
              {transports.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade programada para hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {transports.map((t) => (
                    <li key={t.id} className="text-sm">
                      <div className="font-medium">{t.driver_name}</div>
                      {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                      {t.contact_phone && <div className="text-xs text-muted-foreground">{t.contact_phone}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><h3 className="font-semibold">Estudos e Revisitas</h3></div>
                <Link to="/reunioes-de-campo" className="text-primary text-xs font-medium inline-flex items-center hover:underline">Ver tudo <ChevronRight className="h-3 w-3" /></Link>
              </div>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade programada para hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a) => (
                    <li key={a.id} className="text-sm flex items-start gap-2">
                      <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs">
                        {a.period}{a.meeting_time ? ` · ${a.meeting_time.slice(0,5)}` : ""}
                      </span>
                      <div className="min-w-0">
                        {a.acompanhante && <div className="font-medium truncate">{a.acompanhante}{a.acompanhante_for ? ` → ${a.acompanhante_for}` : ""}</div>}
                        {a.meeting_point && <div className="text-xs text-muted-foreground truncate">{a.meeting_point}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="font-semibold">Reunião de Campo</h3></div>
                <Link to="/reunioes-discursos" className="text-primary text-xs font-medium inline-flex items-center hover:underline">Ver tudo <ChevronRight className="h-3 w-3" /></Link>
              </div>
              {fieldMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade programada para hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {fieldMeetings.map((f) => (
                    <li key={f.id} className="text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                          {f.period}{f.meeting_time ? ` · ${f.meeting_time.slice(0,5)}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">{MODALITY_LABEL[f.modality] ?? f.modality}</span>
                      </div>
                      {f.meeting_location && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{f.meeting_location}</div>}
                      {f.territory_number && <div className="text-xs text-muted-foreground">Território {f.territory_number}{f.territory_location ? ` · ${f.territory_location}` : ""}</div>}
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
