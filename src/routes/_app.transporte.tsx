import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Phone, Car } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";
import { offlineUpdate, offlineInsert, offlineDelete } from "@/lib/offline-supabase";

export const Route = createFileRoute("/_app/transporte")({ component: Page });

interface Transport {
  id: string;
  visit_id: string;
  driver_name: string;
  contact_phone: string | null;
  event_date: string | null;
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
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_schedule", filter: `visit_id=eq.${visit.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("transport.noActiveVisit")}</CardContent></Card>;
  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  const save = async () => {
    if (!editing?.driver_name) { toast.error(t("transport.requireDriver")); return; }
    const payload = {
      visit_id: visit.id,
      driver_name: editing.driver_name,
      contact_phone: editing.contact_phone || null,
      event_date: editing.event_date || null,
      description: editing.description || null,
      notes: editing.notes || null,
    };
    const r = editing.id
      ? await offlineUpdate("transport_schedule", payload, { id: editing.id })
      : await offlineInsert("transport_schedule", payload);
    if (r.error) toast.error(r.error.message);
    else { toast.success(r.queued ? t("common.savedOffline") : t("common.saved")); setOpen(false); setEditing(null); }
  };

  const remove = async (id: string) => {
    const { error } = await offlineDelete("transport_schedule", { id });
    if (error) toast.error(error.message);
  };
  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await offlineUpdate("transport_schedule", { is_active }, { id });
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("transport.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("transport.subtitle")}</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" />{t("transport.newButton")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editing?.id ? t("transport.editTitle") : t("transport.newTitle")}</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div><Label>{t("transport.driverName")}</Label><Input className="mt-1" value={editing.driver_name ?? ""} onChange={(e) => setEditing({ ...editing, driver_name: e.target.value })} /></div>
                  <div><Label>{t("transport.contactPhone")}</Label><Input type="tel" className="mt-1" value={editing.contact_phone ?? ""} onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })} /></div>
                  <div>
                    <Label>{t("transport.day")}</Label>
                    <Select value={editing.event_date ?? "none"} onValueChange={(v) => setEditing({ ...editing, event_date: v === "none" ? null : v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("transport.noSpecificDay")}</SelectItem>
                        {days.map((d) => { const k = format(d, "yyyy-MM-dd"); return <SelectItem key={k} value={k}>{format(d, "EEE, d MMM", { locale: dateLocale })}</SelectItem>; })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t("transport.event")}</Label><Input className="mt-1" placeholder={t("transport.eventPlaceholder")} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                  <div><Label>{t("transport.notes")}</Label><Textarea rows={2} className="mt-1" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
                  <Button className="w-full" onClick={save}>{editing.id ? t("transport.saveChanges") : t("transport.save")}</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isSuper && <SupervisorEditToggle enabled={editEnabled} onChange={setEditEnabled} />}

      <fieldset disabled={!editAllowed} className="grid gap-2 disabled:opacity-70 min-w-0 border-0 p-0 m-0">
        {items.length === 0 && <Card><CardContent className="p-4 text-sm text-muted-foreground">{t("transport.noTransport")}</CardContent></Card>}
        {items.map((tr) => (
          <Card key={tr.id} className={`shadow-card transition ${!tr.is_active ? "opacity-50" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Car className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${!tr.is_active ? "line-through" : ""}`}>{tr.driver_name}</div>
                {tr.contact_phone && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{tr.contact_phone}</div>}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tr.event_date ? format(parseISO(tr.event_date), "EEE, d MMM", { locale: dateLocale }) : t("transport.noDay")}
                  {tr.description ? ` · ${tr.description}` : ""}
                </div>
                {tr.notes && <div className="text-xs mt-1 text-muted-foreground">{tr.notes}</div>}
              </div>
              {canEdit && (
                <div className="flex flex-col items-end gap-1">
                  {isSuper && <Switch checked={tr.is_active} onCheckedChange={(v) => toggle(tr.id, v)} aria-label={t("transport.toggleAria")} />}
                  <div className="flex">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(tr); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    {isSuper && <Button size="icon" variant="ghost" onClick={() => remove(tr.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
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
