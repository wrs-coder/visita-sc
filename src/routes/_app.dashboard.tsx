import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ListChecks,
  MapPin,
  Clock,
  ChevronRight,
  ChevronLeft,
  UtensilsCrossed,
  Building2,
  Car,
  BookOpen,
  Users,
  UserCheck,
  CloudOff,
  FileText,
  AlertTriangle,
  Heart,
  Eye,
} from "lucide-react";
import { useActiveVisit } from "@/hooks/use-active-visit";
import {
  useActiveCongregation,
  setActiveCongregationOverride,
} from "@/hooks/use-active-congregation";
import { format, parseISO, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PwaInstallButton } from "@/components/PwaInstall";
import { FinishVisitDialog } from "@/components/FinishVisitDialog";
import { subscribe as subscribeQueue } from "@/lib/offline-queue";
import { useTranslation } from "react-i18next";
import { listCoupleMessages, type CoupleThread } from "@/lib/couple-messages.functions";

import { listNotesByType, FIXED_FOLDER_WEEK_CONSIDERATIONS, FIXED_FOLDER_WEEK_OUTLINES, type FieldNote } from "@/lib/bible-notes-store";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { DayDetailsDialog } from "@/components/dashboard/DayDetailsDialog";
import { FieldNoteFullscreenDialog } from "@/components/dashboard/FieldNoteFullscreenDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Maximize2, PencilLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";



export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

interface ScheduleEvent {
  id: string;
  event_date: string;
  start_time: string | null;
  title: string;
  location: string | null;
  type: string;
}
interface ChecklistItem {
  id: string;
  status: string;
  title: string | null;
  description: string | null;
  link_or_notes: string | null;
  info_text: string | null;
  sort_order: number | null;
}
interface Meal {
  id: string;
  meal_date: string;
  meal_time: string | null;
  type: string;
  host_name: string | null;
  location: string | null;
  contact_phone: string | null;
  notes: string | null;
}
interface Transport {
  id: string;
  driver_name: string;
  contact_phone: string | null;
  description: string | null;
  notes: string | null;
  event_type: string | null;
  direction: string | null;
  departure_time: string | null;
  return_time: string | null;
  all_day: boolean | null;
}
interface FieldAssignment {
  id: string;
  period: string;
  meeting_point: string | null;
  meeting_time: string | null;
  acompanhante: string | null;
  acompanhante_for: string | null;
  contact_phone: string | null;
  notes: string | null;
}
interface FieldMeetingToday {
  id: string;
  period: string;
  modality: string;
  meeting_time: string | null;
  meeting_location: string | null;
  territory_number: string | null;
  territory_location: string | null;
  auxiliary_leaders: string | null;
  closing_prayer: string | null;
  observations: string | null;
}
interface MeetingTodayItem {
  kind: "midweek" | "weekend" | "pioneer" | "elders";
  meeting_at: string;
  theme: string | null;
  location: string | null;
  chairman?: string | null;
  opening_prayer?: string | null;
  closing_prayer?: string | null;
  public_talk_theme?: string | null;
}

const MODALITY_LABEL: Record<string, string> = {
  casa_em_casa: "Casa em Casa",
  cartas: "Cartas",
  telefone: "Telefone",
  testemunho_publico: "Testemunho Público",
  revisitas: "Revisitas",
  estudos: "Estudos Bíblicos",
};

const ACOMPANHANTE_FOR_LABEL: Record<string, string> = {
  superintendente: "Superintendente",
  esposa: "Esposa do superintendente",
  sc_substituto: "S.C Substituto",
  esposa_sc_substituto: "Esposa do S.C Substituto",
  sc_pastor: "S.C Pastor",
  esposa_sc_pastor: "Esposa do S.C Pastor",
};

const NO_CURRENT_VISIT_VALUE = "__sem-visita__";

function Dashboard() {
  const { profile, role, user } = useAuth();
  const { t } = useTranslation();
  useActiveCongregation(); // mantém o hook montado para sincronizar contexto
  const [selected, setSelected] = useState<string | null>(null);
  const { visit } = useActiveVisit({
    enabled: role !== "superintendent" || !!selected,
    allowPlaceholder: role !== "superintendent",
    congregationId: role === "superintendent" ? selected : undefined,
  });
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [fieldMeetings, setFieldMeetings] = useState<FieldMeetingToday[]>([]);
  const [meetingsToday, setMeetingsToday] = useState<MeetingTodayItem[]>([]);
  const [congs, setCongs] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingCount, setPendingCount] = useState(0);
  type DetailsKey = "field" | "studies" | "meals" | "meetings" | "transport" | "checklist";
  const [openDetails, setOpenDetails] = useState<DetailsKey | null>(null);
  useEffect(() => subscribeQueue(setPendingCount), []);
  const [overdueVisits, setOverdueVisits] = useState<
    Array<{ id: string; title: string; end_date: string; congregation_id: string }>
  >([]);
  const [overdueDialogId, setOverdueDialogId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  // Ajuste 02: alterna entre hoje (0) e amanhã (1) para os 6 cartões diários.
  const [dayOffset, setDayOffset] = useState<0 | 1>(0);
  const viewedDate = addDays(new Date(), dayOffset);
  const viewedIso = format(viewedDate, "yyyy-MM-dd");
  const isTomorrow = dayOffset === 1;

  // Mission 2: eventos do circuito (circuit_schedule_events) do dia vigente.
  const [circuitToday, setCircuitToday] = useState<Array<{
    id: string;
    title: string;
    start_time: string | null;
    location: string | null;
    event_type: string;
  }>>([]);

  // Mission 1: recados da esposa (preview no dashboard).
  const listCoupleFn = useServerFn(listCoupleMessages);
  const [coupleThreads, setCoupleThreads] = useState<CoupleThread[]>([]);
  const [coupleUnread, setCoupleUnread] = useState(0);

  const loadCouple = useCallback(async () => {
    if (role !== "superintendent") return;
    try {
      const r = await listCoupleFn();
      if (r.ok) {
        setCoupleThreads(r.threads);
        setCoupleUnread(r.unread);
      }
    } catch (err) {
      console.warn("[dashboard] couple load failed", err);
    }
  }, [listCoupleFn, role]);

  useEffect(() => {
    loadCouple();
    const id = setInterval(loadCouple, 30_000);
    return () => clearInterval(id);
  }, [loadCouple]);

  // Eventos do circuito de hoje (escopos visíveis ao super = todos os próprios).
  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("circuit_schedule_events")
        .select("id, title, start_time, location, event_type")
        .eq("superintendent_id", user.id)
        .eq("event_date", viewedIso)
        .neq("status", "completed")
        .order("start_time");
      if (!cancelled) setCircuitToday(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [role, user, viewedIso]);

  // Mission: cartão "Esboços e Notas" — aba "Considerações de campo".
  // Mostra apenas notas locais da pasta fixa "Considerações da Semana".
  // Evita chamadas ao Supabase aqui (economia × milhares de usuários).
  type OutlinePreview = {
    key: string;
    id: string;
    title: string;
    updated_at: number;
  };
  type RecomendadoPreview = {
    id: string;
    title: string | null;
    content: string | null;
    payload: Record<string, string> | null;
    updated_at: string;
    congregation_id: string;
  };
  const [outlinesPreview, setOutlinesPreview] = useState<OutlinePreview[]>([]);
  const [weekOutlinesPreview, setWeekOutlinesPreview] = useState<OutlinePreview[]>([]);
  const [recomendadosPreview, setRecomendadosPreview] = useState<RecomendadoPreview[]>([]);
  const [recomendadoOpen, setRecomendadoOpen] = useState<RecomendadoPreview | null>(null);

  // Nota aberta em tela cheia no próprio Dashboard (overlay).
  const [fullscreenNoteId, setFullscreenNoteId] = useState<string | null>(null);
  // Lembra a última preferência ("fullscreen" | "outline") para 1-clique futuro.
  // Persistido em localStorage — zero custo de banco.
  const PREF_KEY = "dashboard.outline-open-pref";
  type OpenPref = "fullscreen" | "outline";
  const [openPref, setOpenPrefState] = useState<OpenPref>(() => {
    if (typeof window === "undefined") return "fullscreen";
    const v = window.localStorage.getItem(PREF_KEY);
    return v === "outline" ? "outline" : "fullscreen";
  });
  const setOpenPref = (p: OpenPref) => {
    setOpenPrefState(p);
    try { window.localStorage.setItem(PREF_KEY, p); } catch { /* quota */ }
  };

  const loadOutlines = useCallback(async () => {
    if (role !== "superintendent") return;
    try {
      const [localField, localOutline] = await Promise.all([
        listNotesByType("field_consideration", FIXED_FOLDER_WEEK_CONSIDERATIONS).catch(() => [] as FieldNote[]),
        listNotesByType("outline", FIXED_FOLDER_WEEK_OUTLINES).catch(() => [] as FieldNote[]),
      ]);
      const toPreview = (arr: FieldNote[]): OutlinePreview[] => arr
        .map((n) => ({
          key: `local:${n.id}`,
          id: n.id,
          title: n.title || "(sem título)",
          updated_at: n.updated_at ?? n.created_at ?? 0,
          sort_order: n.sort_order ?? Number.POSITIVE_INFINITY,
        }))
        // Mesma ordem da pasta original em "Esboços pessoais":
        // sort_order asc, com fallback updated_at desc.
        .sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return b.updated_at - a.updated_at;
        })
        .map(({ sort_order: _s, ...rest }) => rest);
      setOutlinesPreview(toPreview(localField));
      setWeekOutlinesPreview(toPreview(localOutline));
    } catch (err) {
      console.warn("[dashboard] outlines load failed", err);
    }
  }, [role]);

  useEffect(() => {
    loadOutlines();
    const onFocus = () => loadOutlines();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadOutlines]);

  useEffect(() => {
    if (role !== "superintendent" || !user || !selected) {
      setRecomendadosPreview([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("private_notes")
        .select("id, title, content, payload, updated_at, congregation_id")
        .eq("superintendent_id", user.id)
        .eq("congregation_id", selected)
        .eq("note_type", "recomendados")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!cancelled) setRecomendadosPreview((data ?? []) as RecomendadoPreview[]);
    })();
    return () => { cancelled = true; };
  }, [role, user, selected]);



  // Detecta visitas encerradas (end_date < hoje) cujos dados operacionais
  // ainda não foram limpos via "Finalizar Visita". Consulta única e leve por
  // entrada no painel, escopada por RLS às congregações do superintendente.
  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, title, end_date, congregation_id")
        .lt("end_date", today)
        .order("end_date", { ascending: false });
      if (cancelled) return;
      setOverdueVisits(data ?? []);
    })();
  }, [role, user, today, selected]);


  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    supabase
      .from("congregations")
      .select("id,name")
      .eq("superintendent_id", user.id)
      .order("name")
      .then(({ data }) => {
        setCongs(data ?? []);
      });
  }, [role, user]);

  // Auto-seleção pela SEMANA VIGENTE (segunda a domingo, com base no
  // relógio do dispositivo): sempre que o superintendente entra no Início,
  // a seleção reflete a visita que toca a semana atual. A escolha manual
  // continua disponível, mas a próxima entrada volta a refletir a semana
  // corrente. Sem visita na semana → seleção mostra "Sem visita".
  useEffect(() => {
    if (role !== "superintendent" || !user) return;
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    let cancelled = false;
    (async () => {
      // Visita que se sobrepõe à semana atual:
      //   visit.start_date <= weekEnd AND visit.end_date >= weekStart
      // Prioriza a que cobre o dia de hoje; depois a mais próxima do início.
      const { data } = await supabase
        .from("visits")
        .select("congregation_id, start_date, end_date")
        .lte("start_date", weekEnd)
        .gte("end_date", weekStart)
        .eq("is_active", true)
        .order("start_date", { ascending: true });
      if (cancelled) return;
      const list = data ?? [];
      const covering = list.find(
        (v) => v.start_date <= today && v.end_date >= today,
      );
      const match = (covering ?? list[0])?.congregation_id ?? null;
      setSelected(match);
      setActiveCongregationOverride(match);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, user, today]);

  const handleSelectCong = (id: string) => {
    if (id === NO_CURRENT_VISIT_VALUE) {
      setSelected(null);
      setActiveCongregationOverride(null);
      return;
    }
    setSelected(id);
    setActiveCongregationOverride(id);
  };

  useEffect(() => {
    if (!visit) {
      setEvents([]);
      setChecklist([]);
      setMeals([]);
      setTransports([]);
      setAssignments([]);
      setFieldMeetings([]);
      return;
    }
    const fetchAll = async () => {
      const [{ data: e }, { data: c }, { data: m }, { data: t }, { data: a }, { data: fm }] =
        await Promise.all([
          supabase
            .from("schedule_events")
            .select("id, event_date, start_time, title, location, type")
            .eq("visit_id", visit.id)
            .order("event_date")
            .order("start_time"),
          supabase
            .from("checklist_items")
            .select("id, status, title, description, link_or_notes, info_text, sort_order")
            .eq("visit_id", visit.id)
            .order("sort_order")
            .order("created_at"),
          supabase
            .from("meals")
            .select("id, meal_date, meal_time, type, host_name, location, contact_phone, notes")
            .eq("visit_id", visit.id)
            .eq("meal_date", viewedIso)
            .eq("is_active", true)
            .order("meal_time"),
          supabase
            .from("transport_schedule")
            .select("id, driver_name, contact_phone, description, notes, event_type, direction, departure_time, return_time, all_day")
            .eq("visit_id", visit.id)
            .eq("event_date", viewedIso)
            .eq("is_active", true),
          supabase
            .from("field_assignments")
            .select(
              "id, period, meeting_point, meeting_time, acompanhante, acompanhante_for, contact_phone, notes",
            )
            .eq("visit_id", visit.id)
            .eq("event_date", viewedIso)
            .eq("is_active", true)
            .order("period"),
          supabase
            .from("field_meetings")
            .select(
              "id, period, modality, meeting_time, meeting_location, territory_number, territory_location, auxiliary_leaders, closing_prayer, observations",
            )
            .eq("visit_id", visit.id)
            .eq("event_date", viewedIso)
            .eq("is_active", true)
            .order("period"),
        ]);
      setEvents(e ?? []);
      setChecklist((c ?? []) as ChecklistItem[]);
      setMeals((m ?? []) as Meal[]);
      setTransports((t ?? []) as Transport[]);
      setAssignments((a ?? []) as FieldAssignment[]);
      setFieldMeetings((fm ?? []) as FieldMeetingToday[]);
    };
    fetchAll();
    const ch = supabase
      .channel(`dash-${visit.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_items",
          filter: `visit_id=eq.${visit.id}`,
        },
        fetchAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedule_events",
          filter: `visit_id=eq.${visit.id}`,
        },
        fetchAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transport_schedule",
          filter: `visit_id=eq.${visit.id}`,
        },
        fetchAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "field_assignments",
          filter: `visit_id=eq.${visit.id}`,
        },
        fetchAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "field_meetings",
          filter: `visit_id=eq.${visit.id}`,
        },
        fetchAll,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [visit, viewedIso]);

  // "Reuniões de hoje" — busca leituras leves das 4 tabelas (1 linha por visita)
  // alimentadas pela aba "Reuniões e Discursos". Filtra por dia-da-semana
  // (meetings recorrentes usam data-âncora) ou data exata.
  useEffect(() => {
    if (!visit) { setMeetingsToday([]); return; }
    let cancelled = false;
    (async () => {
      const todayDow = new Date().getDay();
      const [mw, we, pi] = await Promise.all([
        supabase.from("midweek_meetings").select("meeting_at, service_talk_theme").eq("visit_id", visit.id).maybeSingle(),
        supabase.from("weekend_meetings").select("meeting_at, talk_theme_title, public_talk_theme").eq("visit_id", visit.id).maybeSingle(),
        supabase.from("pioneer_meetings").select("meeting_at, super_meeting_at, theme, location").eq("visit_id", visit.id).maybeSingle(),
      ]);
      const out: MeetingTodayItem[] = [];
      const push = (kind: MeetingTodayItem["kind"], at: string | null | undefined, theme: string | null | undefined, location: string | null | undefined) => {
        if (!at) return;
        const d = new Date(at);
        if (Number.isNaN(d.getTime())) return;
        if (d.getDay() !== todayDow) return;
        out.push({ kind, meeting_at: at, theme: theme ?? null, location: location ?? null });
      };
      push("midweek", mw.data?.meeting_at, mw.data?.service_talk_theme, null);
      push("weekend", we.data?.meeting_at, we.data?.talk_theme_title ?? we.data?.public_talk_theme, null);
      const piAt = pi.data?.super_meeting_at ?? pi.data?.meeting_at;
      push("pioneer", piAt, pi.data?.theme, pi.data?.location);
      if (!cancelled) setMeetingsToday(out);
    })();
    return () => { cancelled = true; };
  }, [visit, today]);

  // todayEvents removed: replaced by "Hoje no cronograma" (circuit-scoped) card.
  const doneCount = checklist.filter((c) => c.status === "done").length;
  const total = checklist.length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PwaInstallButton />
      <header>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">
          {t("dashboard.greeting", { name: profile?.full_name?.split(" ")[0] ?? t("dashboard.brother") })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {role === "superintendent" ? t("dashboard.panelSuper") : t("dashboard.panelElder")}
          {visit ? ` · ${t("dashboard.visitLabel", { title: visit.title })}` : ` · ${t("dashboard.noActiveVisit")}`}
        </p>
      </header>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 px-3 py-2 text-xs">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            <strong>{pendingCount}</strong>{" "}
            {pendingCount === 1 ? t("dashboard.pendingOne") : t("dashboard.pendingMany")}{" "}
            {t("dashboard.pendingSuffix")}
          </span>
          <span className="hidden sm:inline opacity-70">{t("dashboard.pendingHint")}</span>
        </div>
      )}

      {role === "superintendent" && overdueVisits.length > 0 && (
        <div className="rounded-md border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-semibold">
                {overdueVisits.length === 1
                  ? t("dashboard.overdueTitle1")
                  : t("dashboard.overdueTitleN", { count: overdueVisits.length })}
              </p>
              <p className="text-xs leading-relaxed opacity-90">
                {t("dashboard.overdueHint")}
              </p>
              <ul className="space-y-1.5 pt-1">
                {overdueVisits.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center gap-2 text-xs bg-amber-100/60 dark:bg-amber-900/30 rounded px-2 py-1.5"
                  >
                    <span className="font-medium flex-1 min-w-0 truncate">
                      {v.title}
                      <span className="opacity-70 font-normal">
                        {" · "}{t("dashboard.endedOn")}{" "}
                        {format(parseISO(v.end_date), "dd/MM/yyyy")}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setOverdueDialogId(v.id)}
                    >
                      {t("dashboard.finishNow")}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {overdueVisits.map((v) => (
            <FinishVisitDialog
              key={`dlg-${v.id}`}
              visitId={v.id}
              visitTitle={v.title}
              hideTrigger
              open={overdueDialogId === v.id}
              onOpenChange={(o) => setOverdueDialogId(o ? v.id : null)}
              onFinished={() => {
                setOverdueVisits((prev) => prev.filter((x) => x.id !== v.id));
                setOverdueDialogId(null);
                if (selected === v.congregation_id) {
                  setSelected(null);
                  setActiveCongregationOverride(null);
                }
              }}
            />
          ))}
        </div>
      )}



      {visit && (
        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          <Button asChild size="sm" variant="outline">
            <Link to="/relatorio/$visitId" params={{ visitId: visit.id }}>
              <FileText className="h-4 w-4 mr-1" /> {t("dashboard.executiveReport")}
            </Link>
          </Button>
          {role === "superintendent" && (
            <FinishVisitDialog
              visitId={visit.id}
              visitTitle={visit.title}
              onFinished={() => {
                setSelected(null);
                setActiveCongregationOverride(null);
              }}
            />
          )}
        </div>
      )}


      {role === "superintendent" && congs.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {t("dashboard.activeCongregation")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("dashboard.activeCongregationHelp")}
              </div>
            </div>
            <Select value={selected ?? NO_CURRENT_VISIT_VALUE} onValueChange={handleSelectCong}>
              <SelectTrigger className="w-[200px] max-w-[60vw]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CURRENT_VISIT_VALUE}>{t("dashboard.noVisit")}</SelectItem>
                {congs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {role === "superintendent" && (
        <CollapsibleCard
          id="super-today-circuit"
          icon={<CalendarDays className="h-4 w-4 text-primary" />}
          title={t("dashboard.todayBlockTitle")}
          headerRight={
            <Link to="/cronograma" className="text-primary text-xs font-medium inline-flex items-center hover:underline">
              {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
            </Link>
          }
        >
          {circuitToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.todayBlockEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {circuitToday.map((e) => (
                <li key={e.id} className="flex items-start gap-3 p-2 rounded-md border bg-card">
                  <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[58px] text-center">
                    <Clock className="inline h-3 w-3 mr-0.5" />
                    {e.start_time?.slice(0, 5) ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-primary/70 font-semibold">
                      {t(`schedule.types.${e.event_type}`, { defaultValue: e.event_type })}
                    </div>
                    <div className="font-medium truncate">{e.title}</div>
                    {e.location && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {e.location}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      )}

      {role === "superintendent" && (
        <CollapsibleCard
          id="super-couple"
          icon={<Heart className="h-4 w-4 text-primary" />}
          title={
            <span className="inline-flex items-center gap-2">
              {t("dashboard.coupleCardTitle")}
              {coupleUnread > 0 && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                  {t("dashboard.coupleCardUnread", { count: coupleUnread })}
                </span>
              )}
            </span>
          }
          headerRight={
            <Link to="/comunicacao-casal" className="text-primary text-xs font-medium inline-flex items-center hover:underline">
              {t("dashboard.coupleCardOpen")} <ChevronRight className="h-3 w-3" />
            </Link>
          }
        >
          {coupleThreads.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.coupleCardEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {coupleThreads.slice(0, 3).map((th) => {
                const last = th.replies[th.replies.length - 1] ?? th.root;
                const isUnread = last.author === "wife" && !last.read_by_super;
                return (
                  <li key={th.root.id} className="p-2 rounded-md border bg-card">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm flex-1 min-w-0 truncate">
                        {th.root.title}
                      </div>
                      {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      <span className="font-medium">
                        {last.author === "wife" ? t("couple.fromWife") : t("couple.fromSuper")}:
                      </span>{" "}
                      {last.body}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleCard>
      )}

      {role === "superintendent" && (
        <CollapsibleCard
          id="super-study-notes"
          icon={<BookOpen className="h-4 w-4 text-primary" />}
          title={t("dashboard.studyNotesTitle")}
        >
          <Tabs defaultValue="outlines" className="w-full min-w-0 overflow-hidden">
            <TabsList className="grid h-auto w-full grid-cols-3 items-stretch gap-1">
              <TabsTrigger value="outlines" className="h-auto min-h-9 whitespace-normal break-words px-1.5 py-1.5 text-[11px] leading-tight sm:px-3 sm:text-sm">
                {t("dashboard.studyNotesOutlinesTab")}
              </TabsTrigger>
              <TabsTrigger value="weekOutlines" className="h-auto min-h-9 whitespace-normal break-words px-1.5 py-1.5 text-[11px] leading-tight sm:px-3 sm:text-sm">
                {t("dashboard.studyNotesWeekOutlinesTab")}
              </TabsTrigger>
              <TabsTrigger value="recomendados" className="h-auto min-h-9 whitespace-normal break-words px-1.5 py-1.5 text-[11px] leading-tight sm:px-3 sm:text-sm">
                {t("dashboard.studyNotesRecomendadosTab")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="outlines" className="mt-3">
              {outlinesPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.studyNotesEmptyOutlines")}</p>
              ) : (
                <div className="relative">
                  {/* Lista vertical: ~3 itens visíveis, rola por todas. */}
                  <ul
                    className="space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
                    style={{ maxHeight: "min(18rem, 60vh)" }}
                  >
                    {outlinesPreview.map((o) => (
                      <li key={o.key}>
                        <OutlinePreviewRow
                          note={o}
                          openPref={openPref}
                          onSetPref={setOpenPref}
                          onOpenFullscreen={() => setFullscreenNoteId(o.id)}
                        />
                      </li>
                    ))}
                  </ul>
                  {outlinesPreview.length > 3 && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent" />
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="weekOutlines" className="mt-3">
              {weekOutlinesPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.studyNotesEmptyWeekOutlines")}</p>
              ) : (
                <div className="relative">
                  <ul
                    className="space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
                    style={{ maxHeight: "min(18rem, 60vh)" }}
                  >
                    {weekOutlinesPreview.map((o) => (
                      <li key={o.key}>
                        <OutlinePreviewRow
                          note={o}
                          openPref={openPref}
                          onSetPref={setOpenPref}
                          onOpenFullscreen={() => setFullscreenNoteId(o.id)}
                        />
                      </li>
                    ))}
                  </ul>
                  {weekOutlinesPreview.length > 3 && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent" />
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="recomendados" className="mt-3">
              {recomendadosPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.studyNotesEmptyRecomendados")}</p>
              ) : (
                <ul className="space-y-2">
                  {recomendadosPreview.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setRecomendadoOpen(n)}
                        className="w-full text-left flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/40 transition-colors min-w-0"
                      >
                        <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm whitespace-normal break-words [overflow-wrap:anywhere]">
                            {(n.payload?.nome?.trim() || n.title || "(sem título)")}
                          </div>
                          {n.payload?.tipo && (
                            <div className="text-xs text-muted-foreground whitespace-normal break-words">
                              {n.payload.tipo}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true, locale: ptBR })}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CollapsibleCard>
      )}



      {!visit && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.noActiveVisitMsg")}{" "}
              {role === "superintendent" ? (
                <Link to="/configuracoes" className="text-primary font-medium hover:underline">
                  {t("dashboard.registerNewVisit")}
                </Link>
              ) : (
                t("dashboard.waitSuper")
              )}
            </p>
          </CardContent>
        </Card>
      )}
      {visit &&
        visit.title === "Visita SCS" &&
        (() => {
          const v = visit as unknown as {
            substitute_name?: string | null;
            substitute_phone?: string | null;
          };
          if (!v.substitute_name && !v.substitute_phone) return null;
          return (
            <Card className="shadow-card border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">
                    {t("dashboard.scsSubstitute")}
                  </div>
                  {v.substitute_name && (
                    <div className="text-lg font-bold mt-0.5 break-words">{v.substitute_name}</div>
                  )}
                  {v.substitute_phone && (
                    <a
                      href={`tel:${v.substitute_phone}`}
                      className="text-sm text-foreground/80 mt-1 inline-flex items-center gap-1 hover:text-primary"
                    >
                      📞 {v.substitute_phone}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {visit && (
        <div className="grid gap-4 md:grid-cols-2">
          <CollapsibleCard
            id="visit-checklist"
            icon={<ListChecks className="h-4 w-4 text-primary" />}
            title={t("dashboard.checklistTitle")}
            headerRight={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDetails("checklist")}
                  aria-label={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  title={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Link
                  to="/checklist"
                  className="text-primary text-xs font-medium inline-flex items-center hover:underline"
                >
                  {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-3xl font-bold">{progress}%</div>
                <div className="text-xs text-muted-foreground">
                  {t("dashboard.doneOf", { done: doneCount, total })}
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CollapsibleCard>
        </div>
      )}

      {visit && (
        <div className="grid gap-4 md:grid-cols-2 auto-rows-fr">
          {/* 1 — Reunião de campo */}
          <CollapsibleCard
            id="visit-field-meeting"
            icon={<Users className="h-4 w-4 text-primary" />}
            title={t("dashboard.fieldMeeting")}
            headerRight={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDetails("field")}
                  aria-label={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  title={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Link
                  to="/reunioes-discursos"
                  className="text-primary text-xs font-medium inline-flex items-center hover:underline"
                >
                  {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            {fieldMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noActivityToday")}
              </p>
            ) : (
              <ul className="space-y-3">
                {fieldMeetings.map((f) => (
                  <li key={f.id} className="text-sm space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                        {f.period}
                        {f.meeting_time ? ` · ${f.meeting_time.slice(0, 5)}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {MODALITY_LABEL[f.modality] ?? f.modality}
                      </span>
                    </div>
                    {f.meeting_location && (
                      <div className="text-xs text-muted-foreground break-words whitespace-normal flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{f.meeting_location}</span>
                      </div>
                    )}
                    {f.territory_number && (
                      <div className="text-xs text-muted-foreground break-words whitespace-normal">
                        {t("dashboard.territory")} {f.territory_number}
                        {f.territory_location ? ` · ${f.territory_location}` : ""}
                      </div>
                    )}
                    {f.auxiliary_leaders && (
                      <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {t("dashboard.arrangements")} {f.auxiliary_leaders}
                      </div>
                    )}
                    {f.closing_prayer && (
                      <div className="text-xs text-muted-foreground break-words whitespace-normal">
                        {t("dashboard.closingPrayer")} {f.closing_prayer}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>

          {/* 2 — Estudos e revisitas */}
          <CollapsibleCard
            id="visit-studies"
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            title={t("dashboard.studiesVisits")}
            headerRight={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDetails("studies")}
                  aria-label={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  title={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Link
                  to="/reunioes-de-campo"
                  className="text-primary text-xs font-medium inline-flex items-center hover:underline"
                >
                  {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noActivityToday")}
              </p>
            ) : (
              <ul className="space-y-3">
                {assignments.map((a) => (
                  <li key={a.id} className="text-sm flex items-start gap-2">
                    <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs">
                      {a.period}
                      {a.meeting_time ? ` · ${a.meeting_time.slice(0, 5)}` : ""}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {a.acompanhante && (
                        <div className="font-medium break-words whitespace-normal">
                          {a.acompanhante}
                          {a.acompanhante_for
                            ? ` → ${ACOMPANHANTE_FOR_LABEL[a.acompanhante_for] ?? a.acompanhante_for}`
                            : ""}
                        </div>
                      )}
                      {a.meeting_point && (
                        <div className="text-xs text-muted-foreground break-words whitespace-normal flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{a.meeting_point}</span>
                        </div>
                      )}
                      {a.contact_phone && (
                        <div className="text-xs text-muted-foreground break-words">
                          📞 {a.contact_phone}
                        </div>
                      )}
                      {a.notes && (
                        <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                          {a.notes}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>

          {/* 3 — Refeições de hoje */}
          <CollapsibleCard
            id="visit-meals"
            icon={<UtensilsCrossed className="h-4 w-4 text-primary" />}
            title={t("dashboard.mealsToday")}
            headerRight={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDetails("meals")}
                  aria-label={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  title={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Link
                  to="/refeicoes"
                  className="text-primary text-xs font-medium inline-flex items-center hover:underline"
                >
                  {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            {meals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noActivityToday")}
              </p>
            ) : (
              <ul className="space-y-3">
                {meals.map((m) => (
                  <li key={m.id} className="text-sm flex items-start gap-2">
                    <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs">
                      {m.type === "lunch" ? t("dashboard.meals.lunch") : m.type === "dinner" ? t("dashboard.meals.dinner") : t("dashboard.meals.breakfast")}
                      {m.meal_time ? ` · ${m.meal_time.slice(0, 5)}` : ""}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {m.host_name && (
                        <div className="font-medium break-words whitespace-normal">
                          {m.host_name}
                        </div>
                      )}
                      {m.location && (
                        <div className="text-xs text-muted-foreground break-words whitespace-normal flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{m.location}</span>
                        </div>
                      )}
                      {m.contact_phone && (
                        <div className="text-xs text-muted-foreground break-words">
                          📞 {m.contact_phone}
                        </div>
                      )}
                      {m.notes && (
                        <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                          {m.notes}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>

          {/* 4 — Reuniões de hoje (dados de "Reuniões e Discursos") */}
          <CollapsibleCard
            id="visit-meetings-today"
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
            title={t("dashboard.meetingsToday", { defaultValue: "Reuniões de hoje" })}
            headerRight={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDetails("meetings")}
                  aria-label={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  title={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Link
                  to="/reunioes-discursos"
                  className="text-primary text-xs font-medium inline-flex items-center hover:underline"
                >
                  {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            {meetingsToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noActivityToday")}
              </p>
            ) : (
              <ul className="space-y-3">
                {meetingsToday.map((mt) => {
                  const labels: Record<MeetingTodayItem["kind"], string> = {
                    midweek: t("meetingsTalks.tabMeio", { defaultValue: "Meio de Semana" }),
                    weekend: t("meetingsTalks.tabFim", { defaultValue: "Fim de Semana" }),
                    pioneer: t("meetingsTalks.tabPioneiros", { defaultValue: "Pioneiros" }),
                    elders: t("meetingsTalks.tabAncios", { defaultValue: "Anciãos e Servos" }),
                  };
                  const time = (() => {
                    try {
                      const d = new Date(mt.meeting_at);
                      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                    } catch { return ""; }
                  })();
                  return (
                    <li key={mt.kind} className="text-sm flex items-start gap-2">
                      <span className="inline-flex shrink-0 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                        {labels[mt.kind]}
                        {time ? ` · ${time}` : ""}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {mt.theme && (
                          <div className="font-medium break-words whitespace-normal">
                            {mt.theme}
                          </div>
                        )}
                        {mt.location && (
                          <div className="text-xs text-muted-foreground break-words whitespace-normal flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{mt.location}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleCard>

          {/* 5 — Transporte de hoje */}
          <CollapsibleCard
            id="visit-transport"
            icon={<Car className="h-4 w-4 text-primary" />}
            title={t("dashboard.transportToday")}
            headerRight={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDetails("transport")}
                  aria-label={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  title={t("dashboard.viewDayDetails", { defaultValue: "Ver detalhes do dia" })}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Link
                  to="/transporte"
                  className="text-primary text-xs font-medium inline-flex items-center hover:underline"
                >
                  {t("common.viewAll")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            {transports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noActivityToday")}
              </p>
            ) : (
              <ul className="space-y-3">
                {transports.map((tr) => (
                  <li key={tr.id} className="text-sm space-y-0.5">
                    <div className="font-medium break-words whitespace-normal">
                      {tr.driver_name}
                    </div>
                    {tr.contact_phone && (
                      <div className="text-xs text-muted-foreground break-words">
                        📞 {tr.contact_phone}
                      </div>
                    )}
                    {tr.description && (
                      <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {tr.description}
                      </div>
                    )}
                    {tr.notes && (
                      <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {tr.notes}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>
        </div>
      )}

      {/* Popups "Ver detalhes do dia" — somente leitura, reaproveitam os dados já carregados. */}
      {(() => {
        const dayLabel = format(new Date(), "dd/MM/yyyy");
        const closeDetails = () => setOpenDetails(null);
        return (
          <>
            <DayDetailsDialog
              open={openDetails === "field"}
              onOpenChange={(o) => !o && closeDetails()}
              title={`${t("dashboard.fieldMeeting")} · ${dayLabel}`}
            >
              {fieldMeetings.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard.noActivityToday")}</p>
              ) : (
                <ul className="space-y-4">
                  {fieldMeetings.map((f) => (
                    <li key={f.id} className="space-y-1 border-l-2 border-primary/30 pl-3">
                      <div className="font-medium">
                        {f.period}
                        {f.meeting_time ? ` · ${f.meeting_time.slice(0, 5)}` : ""}
                        {" · "}
                        <span className="text-xs text-muted-foreground">
                          {MODALITY_LABEL[f.modality] ?? f.modality}
                        </span>
                      </div>
                      {f.meeting_location && (
                        <div className="text-xs text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="whitespace-pre-wrap break-words">{f.meeting_location}</span>
                        </div>
                      )}
                      {f.territory_number && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t("dashboard.territory")} </span>
                          {f.territory_number}
                          {f.territory_location ? ` · ${f.territory_location}` : ""}
                        </div>
                      )}
                      {f.auxiliary_leaders && (
                        <div className="text-xs whitespace-pre-wrap break-words">
                          <span className="text-muted-foreground">{t("dashboard.arrangements")} </span>
                          {f.auxiliary_leaders}
                        </div>
                      )}
                      {f.closing_prayer && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t("dashboard.closingPrayer")} </span>
                          {f.closing_prayer}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DayDetailsDialog>

            <DayDetailsDialog
              open={openDetails === "studies"}
              onOpenChange={(o) => !o && closeDetails()}
              title={`${t("dashboard.studiesVisits")} · ${dayLabel}`}
            >
              {assignments.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard.noActivityToday")}</p>
              ) : (
                <ul className="space-y-4">
                  {assignments.map((a) => (
                    <li key={a.id} className="space-y-1 border-l-2 border-primary/30 pl-3">
                      <div className="font-medium">
                        {a.period}
                        {a.meeting_time ? ` · ${a.meeting_time.slice(0, 5)}` : ""}
                      </div>
                      {a.acompanhante && (
                        <div>
                          {a.acompanhante}
                          {a.acompanhante_for
                            ? ` → ${ACOMPANHANTE_FOR_LABEL[a.acompanhante_for] ?? a.acompanhante_for}`
                            : ""}
                        </div>
                      )}
                      {a.meeting_point && (
                        <div className="text-xs text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="whitespace-pre-wrap break-words">{a.meeting_point}</span>
                        </div>
                      )}
                      {a.contact_phone && (
                        <div className="text-xs">📞 {a.contact_phone}</div>
                      )}
                      {a.notes && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{a.notes}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DayDetailsDialog>

            <DayDetailsDialog
              open={openDetails === "meals"}
              onOpenChange={(o) => !o && closeDetails()}
              title={`${t("dashboard.mealsToday")} · ${dayLabel}`}
            >
              {meals.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard.noActivityToday")}</p>
              ) : (
                <ul className="space-y-4">
                  {meals.map((m) => (
                    <li key={m.id} className="space-y-1 border-l-2 border-primary/30 pl-3">
                      <div className="font-medium">
                        {m.type === "lunch"
                          ? t("dashboard.meals.lunch")
                          : m.type === "dinner"
                            ? t("dashboard.meals.dinner")
                            : t("dashboard.meals.breakfast")}
                        {m.meal_time ? ` · ${m.meal_time.slice(0, 5)}` : ""}
                      </div>
                      {m.host_name && <div>{m.host_name}</div>}
                      {m.location && (
                        <div className="text-xs text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="whitespace-pre-wrap break-words">{m.location}</span>
                        </div>
                      )}
                      {m.contact_phone && (
                        <div className="text-xs">📞 {m.contact_phone}</div>
                      )}
                      {m.notes && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{m.notes}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DayDetailsDialog>

            <DayDetailsDialog
              open={openDetails === "meetings"}
              onOpenChange={(o) => !o && closeDetails()}
              title={`${t("dashboard.meetingsToday", { defaultValue: "Reuniões de hoje" })} · ${dayLabel}`}
            >
              {meetingsToday.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard.noActivityToday")}</p>
              ) : (
                <ul className="space-y-4">
                  {meetingsToday.map((mt) => {
                    const labels: Record<MeetingTodayItem["kind"], string> = {
                      midweek: t("meetingsTalks.tabMeio", { defaultValue: "Meio de Semana" }),
                      weekend: t("meetingsTalks.tabFim", { defaultValue: "Fim de Semana" }),
                      pioneer: t("meetingsTalks.tabPioneiros", { defaultValue: "Pioneiros" }),
                      elders: t("meetingsTalks.tabAncios", { defaultValue: "Anciãos e Servos" }),
                    };
                    const time = (() => {
                      try {
                        const d = new Date(mt.meeting_at);
                        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                      } catch { return ""; }
                    })();
                    return (
                      <li key={mt.kind} className="space-y-1 border-l-2 border-primary/30 pl-3">
                        <div className="font-medium">
                          {labels[mt.kind]}
                          {time ? ` · ${time}` : ""}
                        </div>
                        {mt.theme && (
                          <div className="whitespace-pre-wrap break-words">{mt.theme}</div>
                        )}
                        {mt.location && (
                          <div className="text-xs text-muted-foreground flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="whitespace-pre-wrap break-words">{mt.location}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </DayDetailsDialog>

            <DayDetailsDialog
              open={openDetails === "transport"}
              onOpenChange={(o) => !o && closeDetails()}
              title={`${t("dashboard.transportToday")} · ${dayLabel}`}
            >
              {transports.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard.noActivityToday")}</p>
              ) : (
                <ul className="space-y-4">
                  {transports.map((tr) => (
                    <li key={tr.id} className="space-y-1 border-l-2 border-primary/30 pl-3">
                      <div className="font-medium">{tr.driver_name}</div>
                      {tr.contact_phone && (
                        <div className="text-xs">📞 {tr.contact_phone}</div>
                      )}
                      {tr.description && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{tr.description}</div>
                      )}
                      {tr.notes && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{tr.notes}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DayDetailsDialog>

            <DayDetailsDialog
              open={openDetails === "checklist"}
              onOpenChange={(o) => !o && closeDetails()}
              title={t("dashboard.checklistTitle")}
              subtitle={t("dashboard.doneOf", { done: doneCount, total })}
            >
              {checklist.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard.noActivityToday")}</p>
              ) : (
                <ul className="space-y-3">
                  {checklist.map((c) => (
                    <li key={c.id} className="space-y-1 border-l-2 border-primary/30 pl-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium whitespace-pre-wrap break-words flex-1">
                          {c.title || "—"}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground shrink-0">
                          {c.status}
                        </span>
                      </div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{c.description}</div>
                      )}
                      {c.info_text && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{c.info_text}</div>
                      )}
                      {c.link_or_notes && (
                        <div className="text-xs text-primary whitespace-pre-wrap break-all">{c.link_or_notes}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DayDetailsDialog>
          </>
        );
      })()}



      <FieldNoteFullscreenDialog
        noteId={fullscreenNoteId}
        onOpenChange={(open) => { if (!open) setFullscreenNoteId(null); }}
        onSaved={() => { void loadOutlines(); }}
      />

      <Dialog open={!!recomendadoOpen} onOpenChange={(o) => { if (!o) setRecomendadoOpen(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="whitespace-normal break-words [overflow-wrap:anywhere]">
              {recomendadoOpen?.payload?.nome?.trim() || recomendadoOpen?.title || "(sem título)"}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-3 text-foreground/90">
            {(() => {
              if (!recomendadoOpen) return null;
              const p = recomendadoOpen.payload ?? {};
              const fields: { label: string; value?: string | null }[] = [
                { label: t("notes.structured.recomendados.nome", { defaultValue: "Nome" }), value: p.nome },
                { label: t("notes.structured.recomendados.tipo", { defaultValue: "Tipo" }), value: p.tipo },
                { label: t("notes.structured.recomendados.corpo", { defaultValue: "Recomendação do corpo de anciãos" }), value: p.corpo },
                { label: t("notes.structured.recomendados.super", { defaultValue: "Observações do superintendente" }), value: p.super },
              ].filter((f) => f.value && f.value.trim().length > 0);
              if (fields.length === 0 && !recomendadoOpen.content) {
                return <span className="text-muted-foreground">—</span>;
              }
              return (
                <>
                  {fields.map((f) => (
                    <div key={f.label}>
                      <div className="text-xs font-semibold text-muted-foreground">{f.label}</div>
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{f.value}</div>
                    </div>
                  ))}
                  {recomendadoOpen.content && (
                    <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{recomendadoOpen.content}</div>
                  )}
                </>
              );
            })()}
          </div>
          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <Button variant="ghost" onClick={() => setRecomendadoOpen(null)}>
              {t("common.close", { defaultValue: "Fechar" })}
            </Button>
            {recomendadoOpen && (
              <Button asChild>
                <Link
                  to="/notas"
                  search={{ tab: "recomendados", noteId: recomendadoOpen.id, congId: recomendadoOpen.congregation_id }}
                  onClick={() => setRecomendadoOpen(null)}
                >
                  <PencilLine className="h-4 w-4 mr-2" />
                  {t("common.edit", { defaultValue: "Editar" })}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------
// OutlinePreviewRow
// Linha de nota no cartão "Esboços e Notas" → aba "Considerações de campo".
//
// Comportamento:
// - 1 clique simples: aplica a última preferência do usuário (default:
//   tela cheia, sobreposta ao próprio Dashboard).
// - Duplo clique: sempre abre em tela cheia (atalho rápido).
// - Botão "⋯" (ou Enter no foco): abre popover com as duas opções e
//   memoriza a escolha em localStorage para o próximo 1-clique.
// - Suporta teclado (Enter / Space) com a preferência atual.
// ---------------------------------------------------------------
interface OutlineRowProps {
  note: { id: string; title: string; updated_at: number };
  openPref: "fullscreen" | "outline";
  onSetPref: (p: "fullscreen" | "outline") => void;
  onOpenFullscreen: () => void;
}

function OutlinePreviewRow({
  note,
  openPref,
  onSetPref,
  onOpenFullscreen,
}: OutlineRowProps) {
  const { t } = useTranslation();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const applyPref = (pref: "fullscreen" | "outline") => {
    if (pref === "fullscreen") onOpenFullscreen();
    // "outline" usa <Link> nativo no item do popover; aqui só fechamos.
    setPopoverOpen(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={t("dashboard.studyNotesOpenHint")}
      onClick={() => applyPref(openPref)}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenFullscreen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          applyPref(openPref);
        }
      }}
      className="flex min-h-16 items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/40 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
    >
      <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm leading-snug whitespace-normal break-words [overflow-wrap:anywhere]">{note.title}</div>
        <div className="text-xs text-muted-foreground break-words">
          {note.updated_at
            ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ptBR })
            : ""}
        </div>
      </div>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 -mr-1"
            aria-label={t("dashboard.studyNotesOpenFullscreen")}
            onClick={(e) => {
              e.stopPropagation();
              setPopoverOpen(true);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-56 p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent text-left"
            onClick={() => {
              onSetPref("fullscreen");
              applyPref("fullscreen");
            }}
          >
            <Maximize2 className="h-4 w-4 text-primary" />
            <span className="flex-1">{t("dashboard.studyNotesOpenFullscreen")}</span>
            {openPref === "fullscreen" && (
              <span className="text-[10px] text-muted-foreground">★</span>
            )}
          </button>
          <Link
            to="/consideracoes-campo"
            search={{ noteId: note.id, mode: "outline" }}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent text-left"
            onClick={() => {
              onSetPref("outline");
              setPopoverOpen(false);
            }}
          >
            <PencilLine className="h-4 w-4 text-primary" />
            <span className="flex-1">{t("dashboard.studyNotesOpenOutline")}</span>
            {openPref === "outline" && (
              <span className="text-[10px] text-muted-foreground">★</span>
            )}
          </Link>
        </PopoverContent>
      </Popover>
    </div>
  );
}

