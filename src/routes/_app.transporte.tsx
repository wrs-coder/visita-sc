import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Phone, Car, Clock } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";

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

function Page() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const isSuper = role === "superintendent";

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
        .order("event_date", { nullsFirst: false })
        .order("departure_time", { nullsFirst: false });
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

  // Group rows by event_date (null dates each get their own group keyed by id).
  const groups = useMemo(() => {
    const map = new Map<string, Transport[]>();
    for (const it of items) {
      const key = it.event_date ?? `__none__:${it.id}`;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, rows]) => ({ key, rows }));
  }, [items]);

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
    setEditing({});
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
      const payload = {
        visit_id: visit.id,
        driver_name: editing.driver_name!.trim(),
        contact_phone: editing.contact_phone || null,
        event_date: editing.event_date || null,
        notes: editing.notes || null,
      };
      const { error } = await supabase.from("transport_schedule").insert(payload);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t("common.saved"));
      setOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("transport_schedule").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  // Update shared fields (all_day, event_date) across all rows of a group.
  const updateGroup = async (rows: Transport[], patch: Partial<Transport>) => {
    const ids = rows.map((r) => r.id);
    const update: Partial<Transport> = { ...patch };
    if (patch.all_day === true) {
      update.departure_time = null;
      update.return_time = null;
    }
    const { error } = await supabase.from("transport_schedule").update(update).in("id", ids);
    if (error) toast.error(error.message);
  };

  // Update a single row (per-event driver fields).
  const updateRow = async (id: string, patch: Partial<Transport>) => {
    const { error } = await supabase.from("transport_schedule").update(patch).eq("id", id);
    if (error) toast.error(error.message);
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
                <DialogTitle>{t("transport.newTitle")}</DialogTitle>
              </DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div>
                    <Label>{t("transport.day")}</Label>
                    <Select
                      value={editing.event_date ?? "none"}
                      onValueChange={(v) =>
                        setEditing({ ...editing, event_date: v === "none" ? null : v })
                      }
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
                  <div>
                    <Label>{t("transport.driverName")}</Label>
                    <Input
                      className="mt-1"
                      value={editing.driver_name ?? ""}
                      onChange={(e) => setEditing({ ...editing, driver_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("transport.contactPhone")}</Label>
                    <Input
                      type="tel"
                      className="mt-1"
                      value={editing.contact_phone ?? ""}
                      onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })}
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
                    {t("transport.save")}
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
        className="grid gap-3 disabled:opacity-70 min-w-0 border-0 p-0 m-0"
      >
        {groups.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {t("transport.noTransport")}
            </CardContent>
          </Card>
        )}
        {groups.map(({ key, rows }) => {
          const head = rows[0];
          const allActive = rows.every((r) => r.is_active);
          return (
            <Card key={key} className={`shadow-card ${!allActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">
                      {head.event_date
                        ? format(parseISO(head.event_date), "EEE, d MMM", { locale: dateLocale })
                        : t("transport.noDay")}
                    </div>
                  </div>
                  {isSuper && (
                    <Switch
                      checked={allActive}
                      onCheckedChange={(v) => updateGroup(rows, { is_active: v })}
                      aria-label={t("transport.toggleAria")}
                    />
                  )}
                </div>

                {/* All-day toggle (shared for the day) */}
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!head.all_day}
                    onCheckedChange={(v) => updateGroup(rows, { all_day: v })}
                  />
                  {t("transport.allDay")}
                </label>

                {/* Per-event cards */}
                <div className="space-y-3">
                  {rows.map((r, idx) => {
                    const showDriver = !head.all_day || idx === 0;
                    return (
                      <div key={r.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium">
                            {r.event_type ? eventTypeLabel(r.event_type) : t("transport.noDay")}
                            {r.direction ? ` · ${directionLabel(r.direction)}` : ""}
                          </div>
                          {isSuper && (
                            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                        {(r.departure_time || r.return_time) && !head.all_day && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmtTime(r.departure_time)}
                            {r.return_time ? ` → ${fmtTime(r.return_time)}` : ""}
                          </div>
                        )}
                        {showDriver && (
                          <div className="space-y-2 pt-1">
                            <div>
                              <Label className="text-xs">{t("transport.driverName")}</Label>
                              <Input
                                className="mt-1 h-9"
                                defaultValue={r.driver_name}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v && v !== r.driver_name) updateRow(r.id, { driver_name: v });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t("transport.contactPhone")}</Label>
                              <Input
                                type="tel"
                                className="mt-1 h-9"
                                defaultValue={r.contact_phone ?? ""}
                                onBlur={(e) => {
                                  const v = e.target.value;
                                  if (v !== (r.contact_phone ?? "")) updateRow(r.id, { contact_phone: v || null });
                                }}
                              />
                              {r.contact_phone && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Phone className="h-3 w-3" />
                                  {r.contact_phone}
                                </div>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">{t("transport.notes")}</Label>
                              <Textarea
                                rows={2}
                                className="mt-1"
                                defaultValue={r.notes ?? ""}
                                onBlur={(e) => {
                                  const v = e.target.value;
                                  if (v !== (r.notes ?? "")) updateRow(r.id, { notes: v || null });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {head.all_day && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
                      <Clock className="h-3 w-3" /> {t("transport.allDay")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </fieldset>
    </div>
  );
}
