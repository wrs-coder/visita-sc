import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveCongregation } from "@/hooks/use-active-congregation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Clock,
  MapPin,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Users,
  Check,
  CalendarClock,
  EyeOff,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfWeek,
  addDays,
  addWeeks,
  isSameDay,
} from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import type { Locale } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { offlineUpdate, offlineInsert, offlineDelete } from "@/lib/offline-supabase";
import { getHiddenEventIds } from "@/lib/hidden-events";

export const Route = createFileRoute("/_app/cronograma")({
  validateSearch: (search: Record<string, unknown>) => {
    const s = (k: string) => (typeof search[k] === "string" ? (search[k] as string) : undefined);
    return {
      event: s("event"),
      action: search.action === "new" ? ("new" as const) : undefined,
      title: s("title"),
      location: s("location"),
      notes: s("notes"),
      companion: s("companion"),
      congId: s("congId"),
    };
  },
  component: Page,
});

const LOCALES: Record<string, Locale> = { pt: ptBR, en: enUS, es };
const resolveLocale = (lng: string): Locale => LOCALES[lng?.slice(0, 2)] ?? ptBR;

const TYPE_KEYS = [
  "ca_br",
  "ca_co",
  "pioneer_week",
  "free_week",
  "pioneer_special_meeting",
  "regional_convention",
  "pioneer_school",
  "shepherding",
  "other",
] as const;
type EventType = (typeof TYPE_KEYS)[number];

type Scope = "congregation" | "multi" | "all" | "personal" | "wife";

interface Event {
  id: string;
  superintendent_id: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: EventType;
  title: string;
  location: string | null;
  notes: string | null;
  companion: string | null;
  scope: Scope;
  congregation_ids: string[];
  visible_to_spouse: boolean;
  status: string;
}

interface CongregationLite {
  id: string;
  name: string;
}

function Page() {
  const { role, user } = useAuth();
  const activeCong = useActiveCongregation();
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const userId = user?.id;
  const canEdit = role === "superintendent";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const handledDeepLinkRef = useRef<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [congregations, setCongregations] = useState<CongregationLite[]>([]);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postponeFor, setPostponeFor] = useState<Event | null>(null);
  const [deleteFor, setDeleteFor] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [calOpen, setCalOpen] = useState(false);

  // Load events + congregations
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");

    const load = async () => {
      // Filtra na origem: eventos concluídos (status=completed) não devem voltar à UI.
      // For superintendent → own events. For others → events visible to them (RLS filters).
      let query = supabase
        .from("circuit_schedule_events")
        .select("*")
        .neq("status", "completed")
        .gte("event_date", today)
        .order("event_date")
        .order("start_time");
      if (canEdit) query = query.eq("superintendent_id", userId);
      const { data } = await query;
      if (!cancelled) {
        const hidden = getHiddenEventIds();
        setEvents(((data ?? []) as Event[]).filter((e) => !hidden.has(e.id)));
      }
    };

    const loadCongs = async () => {
      if (!canEdit) return;
      const { data } = await supabase
        .from("congregations")
        .select("id,name")
        .eq("superintendent_id", userId)
        .order("name");
      if (!cancelled) setCongregations((data ?? []) as CongregationLite[]);
    };

    load();
    loadCongs();

    const ch = supabase
      .channel(`cse-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "circuit_schedule_events" },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [userId, canEdit]);

  // Deep-link: ?event=<id> abre o editor para o evento alvo (vindo do Resumo da Semana).
  // Se o evento já não existir (concluído / excluído), exibe aviso amigável e limpa a URL.
  useEffect(() => {
    const target = search.event;
    if (!target || !canEdit) return;
    if (events.length === 0) return; // espera primeira carga
    if (handledDeepLinkRef.current === target) return;
    handledDeepLinkRef.current = target;
    const found = events.find((ev) => ev.id === target);
    if (found) {
      setEditing(found);
      setOpen(true);
      setWeekStart(startOfWeek(parseISO(found.event_date), { weekStartsOn: 1 }));
    } else {
      toast.error(t("weekSummary.eventGone"));
    }
    navigate({ search: { event: undefined } as never, replace: true });
  }, [search.event, events, canEdit, navigate, t]);

  // Deep-link: ?action=new&title=...&location=... pré-preenche o dialog de novo evento.
  const handledNewRef = useRef(false);
  useEffect(() => {
    if (search.action !== "new" || !canEdit) return;
    if (handledNewRef.current) return;
    handledNewRef.current = true;
    const matchedCong = search.congId && congregations.some((c) => c.id === search.congId)
      ? search.congId
      : null;
    setEditing({
      event_date: format(new Date(), "yyyy-MM-dd"),
      event_type: "shepherding",
      scope: matchedCong ? "congregation" : "personal",
      congregation_ids: matchedCong ? [matchedCong] : [],
      visible_to_spouse: true,
      title: search.title ?? "",
      location: search.location ?? "",
      notes: search.notes ?? "",
      companion: search.companion ?? "",
    });
    setOpen(true);
    navigate({
      search: {
        event: undefined,
        action: undefined,
        title: undefined,
        location: undefined,
        notes: undefined,
        companion: undefined,
        congId: undefined,
      } as never,
      replace: true,
    });
  }, [search.action, search.title, search.location, search.notes, search.companion, search.congId, canEdit, congregations, navigate]);






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

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    [weekStart],
  );

  const save = async () => {
    if (!editing || !editing.title || !editing.event_date) {
      toast.error(t("schedule.requireTitleDate"));
      return;
    }
    const scope = (editing.scope ?? "personal") as Scope;
    const congIds = editing.congregation_ids ?? [];
    if ((scope === "congregation" || scope === "multi") && congIds.length === 0) {
      toast.error(t("schedule.requireScopeCongregations"));
      return;
    }
    if (!userId) return;

    setSaving(true);
    const payload = {
      superintendent_id: userId,
      event_date: editing.event_date,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
      event_type: (editing.event_type ?? "other") as EventType,
      title: editing.title,
      location: editing.location || null,
      notes: editing.notes || null,
      companion: editing.companion || null,
      scope,
      congregation_ids: scope === "all" || scope === "personal" || scope === "wife" ? [] : congIds,
      visible_to_spouse: scope === "wife" ? true : (editing.visible_to_spouse ?? true),
    };
    const res = editing.id
      ? await offlineUpdate("circuit_schedule_events", payload, { id: editing.id })
      : await offlineInsert("circuit_schedule_events", payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(res.queued ? t("common.savedOffline") : t("common.saved"));
    setOpen(false);
    setEditing(null);
  };

  const complete = async (id: string) => {
    if (!confirm(t("schedule.confirmComplete"))) return;
    const { error } = await offlineDelete("circuit_schedule_events", { id });
    if (error) toast.error(error.message);
    else toast.success(t("schedule.completedToast"));
  };

  const postpone = async (id: string, newDate: string) => {
    const { error } = await offlineUpdate(
      "circuit_schedule_events",
      { event_date: newDate, status: "postponed" },
      { id },
    );
    if (error) toast.error(error.message);
    else {
      toast.success(t("schedule.postponedToast"));
      setPostponeFor(null);
    }
  };

  const removeEvent = async (id: string) => {
    setDeleting(true);
    const { error, queued } = await offlineDelete("circuit_schedule_events", { id });
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(queued ? t("common.savedOffline") : t("schedule.deletedToast"));
    setDeleteFor(null);
  };

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("schedule.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "d MMM", { locale })} – {format(weekEnd, "d MMM", { locale })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("schedule.pickWeek")}>
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={weekStart}
                onSelect={(d) => {
                  if (d) {
                    setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
                    setCalOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={locale}
              />
            </PopoverContent>
          </Popover>
          {canEdit && (
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() =>
                    setEditing({
                      event_date: format(new Date(), "yyyy-MM-dd"),
                      event_type: "other",
                      scope: "personal",
                      congregation_ids: [],
                      visible_to_spouse: true,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> {t("schedule.newEvent")}
                </Button>
              </DialogTrigger>
              <EventDialog
                editing={editing}
                setEditing={setEditing}
                save={save}
                saving={saving}
                congregations={congregations}
                locale={locale}
              />
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("schedule.prevWeek")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          {t("schedule.thisWeek")}
        </Button>
        <Button size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          {t("schedule.nextWeek")}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Mission 3: bloco fixo "Hoje" — sempre visível, oculta o dia duplicado na semana abaixo */}
      {(() => {
        const todayKey = format(new Date(), "yyyy-MM-dd");
        const todayEvents = events.filter((e) => e.event_date === todayKey);
        return (
          <section className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                {t("schedule.todayBlock")} · {format(new Date(), "EEEE, d MMM", { locale })}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">{t("schedule.todayBlockSubtitle")}</p>
            {todayEvents.length === 0 ? (
              <Card>
                <CardContent className="p-3 text-sm text-muted-foreground">
                  {t("schedule.noEvents")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {todayEvents.map((e) => (
                  <EventCard
                    key={e.id}
                    e={e}
                    canEdit={canEdit}
                    congregations={congregations}
                    onEdit={() => { setEditing(e); setOpen(true); }}
                    onComplete={() => complete(e.id)}
                    onPostpone={() => setPostponeFor(e)}
                    onDelete={() => setDeleteFor(e)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })()}

      <div className="space-y-6 select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const todayMark = isSameDay(day, new Date());
          if (todayMark) return null; // oculta o dia duplicado na semana
          const dayEvents = events.filter((e) => e.event_date === key);
          return (
            <section key={key}>
              <h2
                className={cn(
                  "text-sm font-semibold uppercase tracking-wide mb-2",
                  "text-muted-foreground",
                )}
              >
                {format(day, "EEEE, d MMM", { locale })}
              </h2>
              {dayEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    {t("schedule.noEvents")}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-2">
                  {dayEvents.map((e) => (
                    <EventCard
                      key={e.id}
                      e={e}
                      canEdit={canEdit}
                      congregations={congregations}
                      onEdit={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                      onComplete={() => complete(e.id)}
                      onPostpone={() => setPostponeFor(e)}
                      onDelete={() => setDeleteFor(e)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>


      {/* Postpone dialog */}
      <Dialog open={!!postponeFor} onOpenChange={(o) => !o && setPostponeFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("schedule.postponeTo")}</DialogTitle>
          </DialogHeader>
          {postponeFor && (
            <Calendar
              mode="single"
              selected={parseISO(postponeFor.event_date)}
              onSelect={(d) => {
                if (d) postpone(postponeFor.id, format(d, "yyyy-MM-dd"));
              }}
              initialFocus
              className="p-3 pointer-events-auto"
              locale={locale}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedule.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("schedule.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteFor) removeEvent(deleteFor.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("schedule.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!activeCong && !canEdit && (
        <p className="text-xs text-muted-foreground text-center">{t("schedule.emptyNoVisit")}</p>
      )}
    </div>
  );
}

function EventCard({
  e,
  canEdit,
  congregations,
  onEdit,
  onComplete,
  onPostpone,
  onDelete,
}: {
  e: Event;
  canEdit: boolean;
  congregations: CongregationLite[];
  onEdit: () => void;
  onComplete: () => void;
  onPostpone: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const congNames = useMemo(() => {
    if (e.scope === "personal") return t("schedule.personalBadge");
    if (e.scope === "wife") return t("schedule.scopes.wife");
    if (e.scope === "all") return t("schedule.allCongsBadge");
    const map = new Map(congregations.map((c) => [c.id, c.name]));
    return e.congregation_ids.map((id) => map.get(id) ?? "—").join(", ");
  }, [e, congregations, t]);

  return (
    <Card className="shadow-card transition">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[64px] text-center">
          <Clock className="inline h-3 w-3 mr-0.5" />
          {e.start_time?.slice(0, 5) ?? "—"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-primary/70">
            {t(`schedule.types.${e.event_type}`)}
          </div>
          <div className="font-semibold">{e.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Users className="h-3 w-3" />
            {congNames}
            {!e.visible_to_spouse && <EyeOff className="h-3 w-3 ml-1" />}
          </div>
          {e.location && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {e.location}
            </div>
          )}
          {e.companion && (
            <div className="text-xs mt-1">
              <span className="text-muted-foreground">{t("schedule.companion")}: </span>
              {e.companion}
            </div>
          )}
          {e.notes && <div className="text-xs mt-1 text-muted-foreground">{e.notes}</div>}
          {canEdit && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="default" onClick={onComplete}>
                <Check className="h-3.5 w-3.5 mr-1" />
                {t("schedule.complete")}
              </Button>
              <Button size="sm" variant="outline" onClick={onPostpone}>
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                {t("schedule.postpone")}
              </Button>
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EventDialog({
  editing,
  setEditing,
  save,
  saving,
  congregations,
  locale: _locale,
}: {
  editing: Partial<Event> | null;
  setEditing: (e: Partial<Event> | null) => void;
  save: () => void;
  saving: boolean;
  congregations: CongregationLite[];
  locale: Locale;
}) {
  const { t } = useTranslation();
  if (!editing) return null;
  const scope = (editing.scope ?? "personal") as Scope;
  const congIds = editing.congregation_ids ?? [];
  const toggleCong = (id: string) => {
    const next = congIds.includes(id) ? congIds.filter((x) => x !== id) : [...congIds, id];
    setEditing({ ...editing, congregation_ids: next });
  };

  return (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {editing.id ? t("schedule.editEvent") : t("schedule.newEventTitle")}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t("schedule.type")}</Label>
          <Select
            value={editing.event_type ?? "other"}
            onValueChange={(v) => setEditing({ ...editing, event_type: v as EventType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`schedule.types.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t("schedule.titleField")}</Label>
          <Input
            value={editing.title ?? ""}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("schedule.date")}</Label>
            <Input
              type="date"
              value={editing.event_date ?? ""}
              onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("schedule.startTime")}</Label>
            <Input
              type="time"
              value={editing.start_time ?? ""}
              onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("schedule.scope")}</Label>
          <Select
            value={scope}
            onValueChange={(v) => setEditing({ ...editing, scope: v as Scope })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="congregation">{t("schedule.scopes.congregation")}</SelectItem>
              <SelectItem value="multi">{t("schedule.scopes.multi")}</SelectItem>
              <SelectItem value="all">{t("schedule.scopes.all")}</SelectItem>
              <SelectItem value="personal">{t("schedule.scopes.personal")}</SelectItem>
              <SelectItem value="wife">{t("schedule.scopes.wife")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(scope === "congregation" || scope === "multi") && (
          <div className="space-y-1.5">
            <Label>{t("schedule.selectCongregations")}</Label>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1.5">
              {congregations.length === 0 && (
                <p className="text-xs text-muted-foreground">—</p>
              )}
              {congregations.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={congIds.includes(c.id)}
                    onCheckedChange={() => {
                      if (scope === "congregation") {
                        setEditing({ ...editing, congregation_ids: [c.id] });
                      } else {
                        toggleCong(c.id);
                      }
                    }}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>{t("schedule.place")}</Label>
          <Input
            value={editing.location ?? ""}
            onChange={(e) => setEditing({ ...editing, location: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("schedule.companion")}</Label>
          <Input
            placeholder={t("schedule.companionPh")}
            value={editing.companion ?? ""}
            onChange={(e) => setEditing({ ...editing, companion: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("schedule.notes")}</Label>
          <Textarea
            rows={2}
            value={editing.notes ?? ""}
            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
          />
        </div>

        {scope !== "wife" && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="visible-spouse" className="cursor-pointer">
              {t("schedule.visibleToSpouse")}
            </Label>
            <Switch
              id="visible-spouse"
              checked={!(editing.visible_to_spouse ?? true)}
              onCheckedChange={(v) => setEditing({ ...editing, visible_to_spouse: !v })}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving ? "…" : t("common.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
