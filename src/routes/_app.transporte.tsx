import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Phone, Car, Clock } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";
import {
  upsertTransportSlot,
  toggleTransportSlot,
  deleteTransportSlot,
  applyAllDayDriver,
} from "@/lib/transport.functions";

export const Route = createFileRoute("/_app/transporte")({ component: Page });

interface Transport {
  id: string;
  visit_id: string;
  driver_name: string;
  contact_phone: string | null;
  weekday: number | null;
  event_date: string | null;
  event_type: string | null;
  direction: string | null;
  all_day: boolean;
  departure_time: string | null;
  return_time: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
}

const EVENT_TYPES = ["field_service", "meeting", "airport", "meal", "personal", "other"] as const;
const DIRECTIONS = ["pickup", "dropoff", "round_trip"] as const;

function Page() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const isSuper = role === "superintendent";

  const upsertFn = useServerFn(upsertTransportSlot);
  const toggleFn = useServerFn(toggleTransportSlot);
  const deleteFn = useServerFn(deleteTransportSlot);
  const applyAllDayFn = useServerFn(applyAllDayDriver);

  const [items, setItems] = useState<Transport[]>([]);
  const [editing, setEditing] = useState<Partial<Transport> | null>(null);
  const [open, setOpen] = useState(false);
  const [editEnabled, setEditEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const editAllowed = !isSuper || editEnabled;

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase
        .from("transport_schedule")
        .select("*")
        .eq("visit_id", visit.id)
        .order("event_date", { nullsFirst: false });
      setItems((data ?? []) as Transport[]);
    };
    load();
    const ch = supabase
      .channel(`tr-${visit.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transport_schedule", filter: `visit_id=eq.${visit.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [visit]);

  if (!visit)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("transport.noActiveVisit")}
        </CardContent>
      </Card>
    );

  const days = eachDayOfInterval({
    start: parseISO(visit.start_date),
    end: parseISO(visit.end_date),
  });

  const openNew = () => {
    setEditing({ all_day: false, event_type: "field_service", direction: "round_trip" });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.driver_name?.trim()) {
      toast.error(t("transport.requireDriver"));
      return;
    }
    setSaving(true);
    try {
      const eventDate = editing.event_date || null;
      const weekday =
        editing.weekday != null
          ? editing.weekday
          : eventDate
            ? parseISO(eventDate).getDay()
            : null;
      const r = await upsertFn({
        data: {
          id: editing.id,
          visit_id: visit.id,
          driver_name: editing.driver_name!.trim(),
          contact_phone: editing.contact_phone || null,
          weekday,
          event_date: eventDate,
          event_type: (editing.event_type as typeof EVENT_TYPES[number]) || null,
          direction: (editing.direction as typeof DIRECTIONS[number]) || null,
          all_day: !!editing.all_day,
          departure_time: editing.all_day ? null : editing.departure_time || null,
          return_time: editing.all_day ? null : editing.return_time || null,
          description: editing.description || null,
          notes: editing.notes || null,
        },
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      // Se "Dia inteiro" e há data/weekday, oferecer replicar para outros slots do mesmo dia.
      if (editing.all_day && r.id && (eventDate || weekday != null)) {
        const apply = await applyAllDayFn({
          data: {
            visit_id: visit.id,
            source_id: r.id,
            event_date: eventDate,
            weekday,
            driver_name: editing.driver_name!.trim(),
            contact_phone: editing.contact_phone || null,
          },
        });
        if (apply.ok && apply.updated > 0) {
          toast.success(t("transport.allDayApplied", { count: apply.updated }));
        }
      }
      toast.success(t("common.saved"));
      setOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const r = await deleteFn({ data: { id } });
    if (!r.ok) toast.error(r.error);
  };
  const toggle = async (id: string, is_active: boolean) => {
    const r = await toggleFn({ data: { id, is_active } });
    if (!r.ok) toast.error(r.error);
  };

  const fmtTime = (s: string | null) => (s ? s.slice(0, 5) : "");
  const eventTypeLabel = (k: string | null) =>
    k ? t(`transport.eventType.${k}`, { defaultValue: k }) : "";
  const directionLabel = (k: string | null) =>
    k ? t(`transport.direction.${k}`, { defaultValue: k }) : "";

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("transport.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("transport.subtitle")}</p>
        </div>
        {canEdit && (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" />
                {t("transport.newButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing?.id ? t("transport.editTitle") : t("transport.newTitle")}
                </DialogTitle>
              </DialogHeader>
              {editing && (
                <div className="space-y-3">
                  {/* 1. Dia da semana / Data */}
                  <div>
                    <Label>{t("transport.day")}</Label>
                    <Select
                      value={editing.event_date ?? "none"}
                      onValueChange={(v) => {
                        const ev = v === "none" ? null : v;
                        setEditing({
                          ...editing,
                          event_date: ev,
                          weekday: ev ? parseISO(ev).getDay() : editing.weekday ?? null,
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("common.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("transport.noSpecificDay")}</SelectItem>
                        {days.map((d) => {
                          const k = format(d, "yyyy-MM-dd");
                          return (
                            <SelectItem key={k} value={k}>
                              {format(d, "EEE, d MMM", { locale: dateLocale })}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Tipo de evento */}
                  <div>
                    <Label>{t("transport.eventTypeLabel")}</Label>
                    <Select
                      value={editing.event_type ?? "other"}
                      onValueChange={(v) => setEditing({ ...editing, event_type: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`transport.eventType.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Direção */}
                  <div>
                    <Label>{t("transport.directionLabel")}</Label>
                    <Select
                      value={editing.direction ?? "round_trip"}
                      onValueChange={(v) => setEditing({ ...editing, direction: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIRECTIONS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`transport.direction.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Horários */}
                  {!editing.all_day && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>{t("transport.departureTime")}</Label>
                        <Input
                          type="time"
                          className="mt-1"
                          value={fmtTime(editing.departure_time ?? null)}
                          onChange={(e) =>
                            setEditing({ ...editing, departure_time: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("transport.returnTime")}</Label>
                        <Input
                          type="time"
                          className="mt-1"
                          value={fmtTime(editing.return_time ?? null)}
                          onChange={(e) =>
                            setEditing({ ...editing, return_time: e.target.value || null })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* 5. Motorista */}
                  <div>
                    <Label>{t("transport.driverName")}</Label>
                    <Input
                      className="mt-1"
                      value={editing.driver_name ?? ""}
                      onChange={(e) => setEditing({ ...editing, driver_name: e.target.value })}
                    />
                  </div>

                  {/* 6. Telefone */}
                  <div>
                    <Label>{t("transport.contactPhone")}</Label>
                    <Input
                      type="tel"
                      className="mt-1"
                      value={editing.contact_phone ?? ""}
                      onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })}
                    />
                  </div>

                  {/* 7. Dia inteiro */}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="all_day"
                      checked={!!editing.all_day}
                      onCheckedChange={(v) => setEditing({ ...editing, all_day: !!v })}
                    />
                    <Label htmlFor="all_day" className="cursor-pointer">
                      {t("transport.allDay")}
                    </Label>
                  </div>
                  {editing.all_day && (editing.event_date || editing.weekday != null) && (
                    <p className="text-xs text-muted-foreground -mt-1">
                      {t("transport.applyAllDayHint")}
                    </p>
                  )}

                  <div>
                    <Label>{t("transport.event")}</Label>
                    <Input
                      className="mt-1"
                      placeholder={t("transport.eventPlaceholder")}
                      value={editing.description ?? ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("transport.notes")}</Label>
                    <Textarea
                      rows={2}
                      className="mt-1"
                      value={editing.notes ?? ""}
                      onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" disabled={saving} onClick={save}>
                    {editing.id ? t("transport.saveChanges") : t("transport.save")}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isSuper && <SupervisorEditToggle enabled={editEnabled} onChange={setEditEnabled} />}

      <fieldset
        disabled={!editAllowed}
        className="grid gap-2 disabled:opacity-70 min-w-0 border-0 p-0 m-0"
      >
        {items.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {t("transport.noTransport")}
            </CardContent>
          </Card>
        )}
        {items.map((tr) => (
          <Card key={tr.id} className={`shadow-card transition ${!tr.is_active ? "opacity-50" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Car className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${!tr.is_active ? "line-through" : ""}`}>
                  {tr.driver_name}
                </div>
                {tr.contact_phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {tr.contact_phone}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tr.event_date
                    ? format(parseISO(tr.event_date), "EEE, d MMM", { locale: dateLocale })
                    : t("transport.noDay")}
                  {tr.event_type ? ` · ${eventTypeLabel(tr.event_type)}` : ""}
                  {tr.direction ? ` · ${directionLabel(tr.direction)}` : ""}
                </div>
                {(tr.all_day || tr.departure_time || tr.return_time) && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {tr.all_day
                      ? t("transport.allDay")
                      : `${fmtTime(tr.departure_time)}${tr.return_time ? ` → ${fmtTime(tr.return_time)}` : ""}`}
                  </div>
                )}
                {tr.description && (
                  <div className="text-xs mt-1">{tr.description}</div>
                )}
                {tr.notes && <div className="text-xs mt-1 text-muted-foreground">{tr.notes}</div>}
              </div>
              {canEdit && (
                <div className="flex flex-col items-end gap-1">
                  {isSuper && (
                    <Switch
                      checked={tr.is_active}
                      onCheckedChange={(v) => toggle(tr.id, v)}
                      aria-label={t("transport.toggleAria")}
                    />
                  )}
                  <div className="flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(tr);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isSuper && (
                      <Button size="icon" variant="ghost" onClick={() => remove(tr.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </fieldset>
    </div>
  );
}
