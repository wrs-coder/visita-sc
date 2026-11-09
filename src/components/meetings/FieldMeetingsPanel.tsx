import { VisitDayPills, useVisitDay } from "@/components/visit-week/VisitDayPills";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { supabase } from "@/integrations/supabase/client";
import { readWithMirror } from "@/lib/local-first";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { CollapseProvider, CollapseBody, CollapseItem, CollapseAllButton, CollapseIdToggle } from "@/components/ui/collapsible-blocks";
import { FIELD_MODALITIES, FIELD_MODALITY_LABELS } from "@/lib/field-meeting-templates.functions";
import { offlineUpdate, offlineInsert, offlineDelete } from "@/lib/local-write";
import { useVisitTemplateExtras } from "@/hooks/use-visit-template-extras";
import { TemplateExtraEditable } from "./TemplateExtraBlock";
import { Textarea } from "@/components/ui/textarea";
import { useMeetingsEditMode } from "./meetings-edit-mode";
import { EldersFillSection, MissingBadge, countFilled } from "@/components/templates/TemplateChrome";
import { appConfirm } from "@/components/ui/app-dialogs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { fieldVisible, missingFieldCount, type FieldKey } from "@/lib/field-requested";

type Modality = (typeof FIELD_MODALITIES)[number];

interface Row {
  id: string;
  visit_id: string;
  event_date: string;
  period: string;
  modality: Modality;
  meeting_time: string | null;
  meeting_location: string | null;
  territory_number: string | null;
  territory_location: string | null;
  auxiliary_leaders: string | null;
  closing_prayer: string | null;
  observations: string | null;
  is_active: boolean;
  requested_fields?: string[] | null;
}

export function FieldMeetingsPanel() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const { visit } = useActiveVisit();
  const { role } = useAuth();
  const isSuper = role === "superintendent";
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { editEnabled } = useMeetingsEditMode();
  const editAllowed = !isSuper || editEnabled;
  const superEditing = isSuper && editAllowed;
  const extras = useVisitTemplateExtras(visit?.id);

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const res = await readWithMirror<Row & Record<string, unknown>>({
        table: "field_meetings",
        remote: () => supabase
          .from("field_meetings")
          .select("id,visit_id,event_date,period,modality,meeting_time,meeting_location,territory_number,territory_location,auxiliary_leaders,closing_prayer,observations,is_active,requested_fields")
          .eq("visit_id", visit.id)
          .order("event_date")
          .order("period") as never,
        filter: (r) => r.visit_id === visit.id,
        sort: (a, b) =>
          String(a.event_date).localeCompare(String(b.event_date)) ||
          String(a.period).localeCompare(String(b.period)),
      });
      setRows(res.rows as Row[]);
    };
    load();
    const ch = supabase
      .channel(`fm-${visit.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "field_meetings", filter: `visit_id=eq.${visit.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  const update = useCallback(async (id: string, patch: Partial<Row>) => {
    setSavingId(id);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error, queued } = await offlineUpdate("field_meetings", patch, { id });
    setSavingId(null);
    if (error) toast.error(error.message);
    else if (queued) toast.success(t("common.savedOffline"));
  }, [t]);

  const add = async (date: string, period: string) => {
    if (!visit) return;
    const { error } = await offlineInsert("field_meetings", { visit_id: visit.id, event_date: date, period });
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await offlineDelete("field_meetings", { id });
    if (error) toast.error(error.message);
  };

  const dayKeys = visit ? eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) }).map((d) => format(d, "yyyy-MM-dd")) : [];
  const [activeDay, setActiveDay] = useVisitDay(dayKeys);
  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("meetingsTalks.field.noActiveVisit")}</CardContent></Card>;

  const days = eachDayOfInterval({ start: parseISO(visit.start_date), end: parseISO(visit.end_date) });

  const morning = t("meetingsTalks.field.morning");
  const afternoon = t("meetingsTalks.field.afternoon");

  const collapseIds = [
    ...days.map((d) => `day:${format(d, "yyyy-MM-dd")}`),
    ...rows.map((r) => `ev:${r.id}`),
  ];
  const missing = isSuper ? 0 : missingFieldCount(rows.filter((r) => r.is_active));
  const copyTargets = (r: Row) => rows.filter((x) => x.id !== r.id && x.is_active);
  const dayLabel = (r: Row) => [format(parseISO(r.event_date), "EEE d", { locale: dateLocale }), r.period, r.meeting_time?.slice(0, 5), FIELD_MODALITY_LABELS[r.modality as Modality]].filter(Boolean).join(" · ");
  const rowSummary = (r: Row) =>
    [r.period, r.meeting_time?.slice(0, 5), r.meeting_location].filter(Boolean).join(" · ");

  return (
    <CollapseProvider scope="field-meetings" visitId={visit.id}>
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {isSuper
          ? t("meetingsTalks.field.subtitleSuper")
          : t("meetingsTalks.field.subtitleElder")}
      </p>
      <MissingBadge count={missing} />

      <TemplateExtraEditable
        label={t("meetingsTalks.fromTemplate.fieldObservations")}
        value={extras.field?.observations}
        templateValue={extras.templateExtras.field?.observations}
        visitId={visit.id} field="field_observations"
        editable={isSuper && editAllowed} type="textarea"
        variant="blue"
        onSaved={extras.reload}
      />

      <VisitDayPills days={days} active={activeDay} onPick={setActiveDay} hasItems={(k) => rows.some((r) => r.event_date === k)} />
      <div className="flex justify-end"><CollapseAllButton ids={collapseIds} /></div>

      {superEditing || !isSuper ? (
        <div className="space-y-5 min-w-0">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayRows = rows.filter((r) => r.event_date === key);
            return (
              <section key={key} hidden={key !== activeDay}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex min-w-0 items-center gap-1">
                    <CollapseIdToggle id={`day:${key}`} />
                    <h2 className="truncate text-sm font-semibold uppercase tracking-wide text-muted-foreground">{format(d, "EEEE, d MMM", { locale: dateLocale })}</h2>
                  </div>
                  {superEditing && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => add(key, morning)}><Plus className="h-3 w-3 mr-1" />{morning}</Button>
                      <Button size="sm" variant="outline" onClick={() => add(key, afternoon)}><Plus className="h-3 w-3 mr-1" />{afternoon}</Button>
                    </div>
                  )}
                </div>
                <CollapseBody id={`day:${key}`}>
                {dayRows.length === 0 ? (
                  <Card><CardContent className="p-4 text-sm text-muted-foreground">{t("meetingsTalks.field.noShifts")}</CardContent></Card>
                ) : (
                  dayRows.map((r) => (
                    <CollapseItem key={r.id} id={`ev:${r.id}`} summary={rowSummary(r)}>
                      <RowCard row={r} isSuper={superEditing} realSuper={isSuper} saving={savingId === r.id} update={update} remove={remove} targets={copyTargets(r)} dayLabel={dayLabel} />
                    </CollapseItem>
                  ))
                )}
                </CollapseBody>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5 min-w-0">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayRows = rows.filter((r) => r.event_date === key);
            return (
              <section key={key} hidden={key !== activeDay}>
                <div className="flex min-w-0 items-center gap-1 mb-2">
                  <CollapseIdToggle id={`day:${key}`} />
                  <h2 className="truncate text-sm font-semibold uppercase tracking-wide text-muted-foreground">{format(d, "EEEE, d MMM", { locale: dateLocale })}</h2>
                </div>
                <CollapseBody id={`day:${key}`}>
                {dayRows.length === 0 ? (
                  <Card><CardContent className="p-4 text-sm text-muted-foreground">{t("meetingsTalks.field.noShifts")}</CardContent></Card>
                ) : (
                  dayRows.map((r) => (
                    <CollapseItem key={r.id} id={`ev:${r.id}`} summary={rowSummary(r)}>
                      <RowCard row={r} isSuper={false} realSuper={isSuper} saving={false} update={update} remove={remove} targets={copyTargets(r)} dayLabel={dayLabel} />
                    </CollapseItem>
                  ))
                )}
                </CollapseBody>
              </section>
            );
          })}
        </div>
      )}
    </div>
    </CollapseProvider>
  );
}

function RowCard({ row: r, isSuper, realSuper, saving, update, remove, targets, dayLabel, readOnly = false }: { row: Row; isSuper: boolean; realSuper: boolean; saving: boolean; update: (id: string, p: Partial<Row>) => Promise<void>; remove: (id: string) => void; targets: Row[]; dayLabel: (r: Row) => string; readOnly?: boolean }) {
  const { t } = useTranslation();
  const show = (f: FieldKey) => fieldVisible(r, f, realSuper);
  const [meeting_time, setMeetingTime] = useState(r.meeting_time ?? "");
  const [meeting_location, setMeetingLocation] = useState(r.meeting_location ?? "");
  const [territory_number, setTerritoryNumber] = useState(r.territory_number ?? "");
  const [territory_location, setTerritoryLocation] = useState(r.territory_location ?? "");
  const [auxiliary_leaders, setAuxiliaryLeaders] = useState(r.auxiliary_leaders ?? "");
  const [closing_prayer, setClosingPrayer] = useState(r.closing_prayer ?? "");

  useEffect(() => {
    setMeetingTime(r.meeting_time ?? "");
    setMeetingLocation(r.meeting_location ?? "");
    setTerritoryNumber(r.territory_number ?? "");
    setTerritoryLocation(r.territory_location ?? "");
    setAuxiliaryLeaders(r.auxiliary_leaders ?? "");
    setClosingPrayer(r.closing_prayer ?? "");
  }, [r.id, r.meeting_time, r.meeting_location, r.territory_number, r.territory_location, r.auxiliary_leaders, r.closing_prayer]);

  const dirty =
    meeting_time !== (r.meeting_time ?? "") ||
    meeting_location !== (r.meeting_location ?? "") ||
    territory_number !== (r.territory_number ?? "") ||
    territory_location !== (r.territory_location ?? "") ||
    auxiliary_leaders !== (r.auxiliary_leaders ?? "") ||
    closing_prayer !== (r.closing_prayer ?? "");

  const everSaved = !!(r.meeting_time || r.meeting_location || r.territory_number || r.territory_location || r.auxiliary_leaders || r.closing_prayer);
  const locationMissing = !meeting_location.trim();

  const handleSave = () => {
    if (!dirty) return;
    update(r.id, {
      meeting_time: meeting_time || null,
      meeting_location: meeting_location || null,
      territory_number: territory_number || null,
      territory_location: territory_location || null,
      auxiliary_leaders: auxiliary_leaders || null,
      closing_prayer: closing_prayer || null,
    });
  };

  return (
    <Card className={`shadow-card mb-2 transition ${!r.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className={`text-xs font-semibold px-2 py-1 rounded ${r.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>
              {r.period}
              {!r.is_active && ` · ${t("meetingsTalks.field.deactivated")}`}
            </div>
            <div className="text-xs text-muted-foreground truncate">{FIELD_MODALITY_LABELS[r.modality]}</div>
          </div>
          <div className="flex items-center gap-2">
            {isSuper && <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} aria-label={t("meetingsTalks.field.deactivated")} />}
            {isSuper && (
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        {isSuper ? (
          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide font-medium text-blue-600 dark:text-blue-400 opacity-80">
              {t("meetingsTalks.fromTemplate.fieldObservations")}
            </div>
            <Textarea
              rows={2}
              defaultValue={r.observations ?? ""}
              placeholder={t("meetingsTalks.fromTemplate.fieldObservationsPlaceholder")}
              className="mt-1 bg-background/60"
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (r.observations ?? "")) update(r.id, { observations: v || null });
              }}
            />
          </div>
        ) : (
          r.observations && r.observations.trim() && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide font-medium text-blue-600 dark:text-blue-400 opacity-80">
                {t("meetingsTalks.fromTemplate.fieldObservations")}
              </div>
              <div className="text-sm whitespace-pre-wrap mt-0.5 text-blue-600 dark:text-blue-400">{r.observations}</div>
            </div>
          )
        )}
        {isSuper && (
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t("meetingsTalks.field.modality")}</label>
            <Select value={r.modality} onValueChange={(v) => update(r.id, { modality: v as Modality })}>
              <SelectTrigger className="h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>{FIELD_MODALITY_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t("meetingsTalks.field.time")}</label>
            <Input type="time" value={meeting_time} readOnly={!isSuper} onChange={(e) => setMeetingTime(e.target.value)} className="h-9 mt-0.5" />
          </div>
        </div>
        {(
          <EldersFillSection
            autoOpen
            filled={countFilled([meeting_location, show("territory_number") ? territory_number : null, show("territory_location") ? territory_location : null, show("auxiliary_leaders") ? auxiliary_leaders : null, show("closing_prayer") ? closing_prayer : null])}
            total={1 + (["territory_number", "territory_location", "auxiliary_leaders", "closing_prayer"] as FieldKey[]).filter(show).length}
          >
            <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              {t("meetingsTalks.field.location")} <span className="text-destructive">*</span>
            </label>
            <Input
              value={meeting_location}
              onChange={(e) => setMeetingLocation(e.target.value)}
              placeholder={t("meetingsTalks.field.locationPlaceholder")}
              className={`h-9 mt-0.5 ${locationMissing ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
              {!readOnly && (
          <div className="flex justify-end mt-1">
            <CopyToDays label={t("meetingsTalks.field.location")} value={meeting_location} field="meeting_location" targets={targets} dayLabel={dayLabel} update={update} />
          </div>
        )}
            </div>
            {show("territory_number") && (
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t("meetingsTalks.field.territoryNumber")}</label>
                <Input value={territory_number} readOnly={readOnly} onChange={(e) => setTerritoryNumber(e.target.value)} className={`h-9 mt-0.5 ${!readOnly && !territory_number.trim() ? "border-destructive focus-visible:ring-destructive" : ""}`} />
              </div>
            )}
            {show("territory_location") && (
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t("meetingsTalks.field.territoryLocation")}</label>
                <Input value={territory_location} readOnly={readOnly} onChange={(e) => setTerritoryLocation(e.target.value)} className={`h-9 mt-0.5 ${!readOnly && !territory_location.trim() ? "border-destructive focus-visible:ring-destructive" : ""}`} />
              </div>
            )}
            {show("auxiliary_leaders") && (
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t("meetingsTalks.field.auxiliaryLeaders")}</label>
                <Input value={auxiliary_leaders} readOnly={readOnly} onChange={(e) => setAuxiliaryLeaders(e.target.value)} className={`h-9 mt-0.5 ${!readOnly && !auxiliary_leaders.trim() ? "border-destructive focus-visible:ring-destructive" : ""}`} />
                {!readOnly && (
                  <div className="flex justify-end mt-1">
                    <CopyToDays label={t("meetingsTalks.field.auxiliaryLeaders")} value={auxiliary_leaders} field="auxiliary_leaders" targets={targets} dayLabel={dayLabel} update={update} />
                  </div>
                )}
              </div>
            )}
            {show("closing_prayer") && (
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t("meetingsTalks.field.closingPrayer")}</label>
                <Input value={closing_prayer} readOnly={readOnly} onChange={(e) => setClosingPrayer(e.target.value)} className={`h-9 mt-0.5 ${!readOnly && !closing_prayer.trim() ? "border-destructive focus-visible:ring-destructive" : ""}`} />
              </div>
            )}
          </EldersFillSection>
        )}
        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            {everSaved ? t("meetingsTalks.field.saveChanges") : t("meetingsTalks.field.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** "Copiar para…": copia o valor para os dias/turnos marcados. */
function CopyToDays({ label, value, field, targets, dayLabel, update }: {
  label: string; value: string; field: "meeting_location" | "auxiliary_leaders"; targets: Row[];
  dayLabel: (r: Row) => string; update: (id: string, p: Partial<Row>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  if (!targets.length) return null;
  const run = async () => {
    const chosen = targets.filter((r) => sel.includes(r.id));
    const overwrite = chosen.filter((r) => (r[field] ?? "").trim() && (r[field] ?? "") !== value);
    if (overwrite.length) {
      const ok = await appConfirm(t("meetingsTalks.field.copyOverwrite", { count: overwrite.length, defaultValue: `${overwrite.length} dia(s) já têm algo escrito. Substituir?` }));
      if (!ok) return;
    }
    for (const r of chosen) await update(r.id, { [field]: value || null } as Partial<Row>);
    setOpen(false);
    setSel([]);
    toast.success(t("meetingsTalks.field.copied", { count: chosen.length, defaultValue: `Copiado para ${chosen.length} dia(s)` }));
  };
  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" disabled={!value.trim()} title={!value.trim() ? t("meetingsTalks.field.copyEmpty", { defaultValue: "Escreva algo para copiar" }) : undefined} onClick={() => setOpen(true)}>
        <Copy className="h-3.5 w-3.5 mr-1" />{t("meetingsTalks.field.copyTo", { defaultValue: "Copiar para…" })}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{label}: “{value}”</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto divide-y rounded-xl border">
            {targets.map((r) => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <Checkbox checked={sel.includes(r.id)} onCheckedChange={(v) => setSel((s) => v ? [...s, r.id] : s.filter((x) => x !== r.id))} />
                <span className="flex-1 capitalize">{dayLabel(r)}</span>
                {(r[field] ?? "").trim() && <span className="max-w-[40%] truncate text-xs text-muted-foreground">{r[field]}</span>}
              </label>
            ))}
          </div>
          <Button type="button" size="sm" variant="ghost" className="self-start h-7 px-2 text-xs text-primary"
            onClick={() => setSel(targets.filter((r) => !(r[field] ?? "").trim()).map((r) => r.id))}>
            {t("meetingsTalks.field.copyOnlyEmpty", { defaultValue: "Marcar só os vazios" })}
          </Button>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
            <Button className="flex-1" disabled={!sel.length} onClick={() => void run()}>{t("meetingsTalks.field.copy", { defaultValue: "Copiar" })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
