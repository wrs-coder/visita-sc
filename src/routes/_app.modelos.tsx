import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { listTemplates, upsertTemplate, replaceTemplateItems } from "@/lib/templates.functions";
import { exportProgramTemplate, importProgramTemplate } from "@/lib/template-io.functions";
import { TemplateIOButtons } from "@/components/TemplateIOButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileStack, Save, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/modelos")({ component: Page });

type Kind = "study" | "meal" | "transport";
type PayloadValue = string | number | boolean | null;
type Payload = Record<string, PayloadValue>;
interface ItemDraft { kind: Kind; day_offset: number; payload: Payload; sort_order: number; }
interface TemplateRow { id: string; slot: number; name: string; meal_day_notes?: Record<string, string> | null; general_observations?: string | null; study_day_notes?: Record<string, string> | null; study_general_observations?: string | null }
interface TemplateItemRow { id: string; template_id: string; kind: string; day_offset: number; payload: Payload; sort_order: number; }

const DAY_OPTS = [0, 1, 2, 3, 4, 5, 6];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function Page() {
  const { t } = useTranslation();
  const DAY_LABEL: Record<number, string> = useMemo(() => ({
    0: t("templates.days.0"), 1: t("templates.days.1"), 2: t("templates.days.2"),
    3: t("templates.days.3"), 4: t("templates.days.4"), 5: t("templates.days.5"), 6: t("templates.days.6"),
  }), [t]);
  const DEFAULT_NAMES: Record<number, string> = useMemo(
    () => Object.fromEntries(SLOTS.map((s) => [s, t("templates.templateNumber", { n: s })])),
    [t]
  );
  const { role } = useAuth();
  const fnList = useServerFn(listTemplates);
  const fnUpsert = useServerFn(upsertTemplate);
  const fnReplace = useServerFn(replaceTemplateItems);
  const fnExport = useServerFn(exportProgramTemplate);
  const fnImport = useServerFn(importProgramTemplate);
  const [tpls, setTpls] = useState<TemplateRow[]>([]);
  const [itemsByTpl, setItemsByTpl] = useState<Record<string, ItemDraft[]>>({});
  const [namesBySlot, setNamesBySlot] = useState<Record<number, string>>({});
  const [notesBySlot, setNotesBySlot] = useState<Record<number, Record<string, string>>>({});
  const [genObsBySlot, setGenObsBySlot] = useState<Record<number, string>>({});
  const [studyNotesBySlot, setStudyNotesBySlot] = useState<Record<number, Record<string, string>>>({});
  const [studyGenObsBySlot, setStudyGenObsBySlot] = useState<Record<number, string>>({});
  const [activeSlot, setActiveSlot] = useState("1");
  const [busy, setBusy] = useState(false);
  const [dupSlot, setDupSlot] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fnList();
    if (!r.ok) return;
    setTpls(r.templates as TemplateRow[]);
    const map: Record<string, ItemDraft[]> = {};
    for (const t of r.templates) map[t.id] = [];
    const items = r.items as TemplateItemRow[];
    for (const it of items) {
      map[it.template_id] = map[it.template_id] || [];
      map[it.template_id].push({ kind: it.kind as Kind, day_offset: it.day_offset, payload: it.payload, sort_order: it.sort_order });
    }
    setItemsByTpl(map);
    const names: Record<number, string> = { ...DEFAULT_NAMES };
    const notesMap: Record<number, Record<string, string>> = {};
    const obsMap: Record<number, string> = {};
    const studyNotesMap: Record<number, Record<string, string>> = {};
    const studyObsMap: Record<number, string> = {};
    for (const t of r.templates) {
      names[t.slot] = t.name;
      const raw = (t as TemplateRow).meal_day_notes;
      notesMap[t.slot] = (raw && typeof raw === "object" ? raw : {}) as Record<string, string>;
      obsMap[t.slot] = ((t as TemplateRow).general_observations) ?? "";
      const rawStudy = (t as TemplateRow).study_day_notes;
      studyNotesMap[t.slot] = (rawStudy && typeof rawStudy === "object" ? rawStudy : {}) as Record<string, string>;
      studyObsMap[t.slot] = ((t as TemplateRow).study_general_observations) ?? "";
    }
    setNamesBySlot(names);
    setNotesBySlot(notesMap);
    setGenObsBySlot(obsMap);
    setStudyNotesBySlot(studyNotesMap);
    setStudyGenObsBySlot(studyObsMap);
  }, [fnList]);

  useEffect(() => { load(); }, [load]);

  if (role !== "superintendent") return <Card><CardContent className="p-6 text-sm">{t("templates.restricted")}</CardContent></Card>;

  const ensureTemplate = async (slot: number): Promise<string | null> => {
    const existing = tpls.find((t) => t.slot === slot);
    if (existing) return existing.id;
    const r = await fnUpsert({ data: { slot, name: namesBySlot[slot] || `Modelo ${slot}` } });
    if (!r.ok) { toast.error(r.error); return null; }
    await load();
    return r.id;
  };

  const renameSlot = async (slot: number, name: string) => {
    setNamesBySlot({ ...namesBySlot, [slot]: name });
    const r = await fnUpsert({ data: { slot, name } });
    if (!r.ok) toast.error(r.error);
  };

  const saveItems = async (slot: number) => {
    setBusy(true);
    const id = await ensureTemplate(slot);
    if (!id) { setBusy(false); return; }
    const items = (itemsByTpl[id] ?? []).map((it, i) => ({ ...it, sort_order: i }));
    const r = await fnReplace({ data: { templateId: id, items } });
    setBusy(false);
    if (!r.ok) toast.error(r.error);
    else { toast.success(t("templates.templateSaved")); load(); }
  };

  const duplicateSlot = async (fromSlot: number, toSlot: number) => {
    setBusy(true);
    const fromTpl = tpls.find((t) => t.slot === fromSlot);
    const fromItems = fromTpl ? (itemsByTpl[fromTpl.id] ?? []) : [];
    const fromNotes = notesBySlot[fromSlot] ?? {};
    const fromName = namesBySlot[fromSlot] || DEFAULT_NAMES[fromSlot];
    const copyPrefix = t("templates.program.copyPrefix", { defaultValue: "Cópia de" });
    const toName = `${copyPrefix} ${fromName}`;
    const r = await fnUpsert({ data: { slot: toSlot, name: toName, meal_day_notes: fromNotes } });
    if (!r.ok) { toast.error(r.error); setBusy(false); return; }
    const itemsCopy = fromItems.map((it, i) => ({ ...it, sort_order: i }));
    const r2 = await fnReplace({ data: { templateId: r.id!, items: itemsCopy } });
    setBusy(false);
    if (!r2.ok) { toast.error(r2.error); return; }
    toast.success(t("templates.program.duplicated", { defaultValue: "Modelo duplicado" }));
    setDupSlot(null);
    setActiveSlot(String(toSlot));
    await load();
  };

  const updateDraft = (tplId: string, idx: number, patch: Partial<ItemDraft>) => {
    setItemsByTpl((m) => ({
      ...m,
      [tplId]: (m[tplId] ?? []).map((it, i) => (i === idx ? { ...it, ...patch, payload: { ...it.payload, ...(patch.payload ?? {}) } } : it)),
    }));
  };

  const addItem = async (slot: number, kind: Kind) => {
    const id = await ensureTemplate(slot);
    if (!id) return;
    const defaults: Payload =
      kind === "study" ? { period: "Manhã", meeting_point: "", meeting_time: "", acompanhante: "", acompanhante_for: "", contact_phone: "" }
      : kind === "meal" ? { type: "lunch", host_name: "", location: "", meal_time: "", notes: "" }
      : {
          all_day: false,
          events_json: JSON.stringify([
            { event_type: "field_service", event_type_other: "", direction: "round_trip", departure_time: "", return_time: "", driver_name: "", contact_phone: "", notes: "" },
          ]),
        };
    setItemsByTpl((m) => ({ ...m, [id]: [...(m[id] ?? []), { kind, day_offset: 0, payload: defaults, sort_order: (m[id]?.length ?? 0) }] }));
  };

  const removeItem = (tplId: string, idx: number) => {
    setItemsByTpl((m) => ({ ...m, [tplId]: (m[tplId] ?? []).filter((_, i) => i !== idx) }));
  };

  const saveMealNote = async (slot: number, dayOffsetKey: string, value: string) => {
    const current = notesBySlot[slot] ?? {};
    const next = { ...current };
    if (value.trim()) next[dayOffsetKey] = value;
    else delete next[dayOffsetKey];
    setNotesBySlot({ ...notesBySlot, [slot]: next });
    const r = await fnUpsert({ data: { slot, name: namesBySlot[slot] || `Modelo ${slot}`, meal_day_notes: next } });
    if (!r.ok) toast.error(r.error);
  };

  const saveStudyNote = async (slot: number, dayOffsetKey: string, value: string) => {
    const current = studyNotesBySlot[slot] ?? {};
    const next = { ...current };
    if (value.trim()) next[dayOffsetKey] = value;
    else delete next[dayOffsetKey];
    setStudyNotesBySlot({ ...studyNotesBySlot, [slot]: next });
    const r = await fnUpsert({ data: { slot, name: namesBySlot[slot] || `Modelo ${slot}`, study_day_notes: next } });
    if (!r.ok) toast.error(r.error);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><FileStack className="h-6 w-6" /> {t("templates.program.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("templates.program.subtitle")}</p>
        </div>
        <TemplateIOButtons
          filenameBase={namesBySlot[Number(activeSlot)] ?? t("templates.exportProgram", { n: activeSlot })}
          onExport={async () => {
            const tpl = tpls.find((tp) => tp.slot === Number(activeSlot));
            if (!tpl) return { ok: false, error: t("templates.exportFirst") };
            return fnExport({ data: { id: tpl.id } });
          }}
          onImport={async (file) => { const r = await fnImport({ data: { file: file as never, slot: Number(activeSlot) } }); if (r.ok) await load(); return r; }}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("templates.program.templateLabel")}</Label>
        <Select value={activeSlot} onValueChange={setActiveSlot}>
          <SelectTrigger className="h-9 max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SLOTS.map((s) => <SelectItem key={s} value={String(s)}>{namesBySlot[s] || t("templates.templateNumber", { n: s })}</SelectItem>)}
          </SelectContent>
        </Select>
        {dupSlot === null ? (
          <Button size="sm" variant="outline" onClick={() => setDupSlot(activeSlot)}>
            <Copy className="h-4 w-4 mr-1" /> {t("templates.program.duplicateTemplate", { defaultValue: "Duplicar modelo" })}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("templates.program.duplicateTo", { defaultValue: "Copiar para" })}</span>
            <Select value={String(dupSlot)} onValueChange={(v) => setDupSlot(v)}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SLOTS.map((s) => <SelectItem key={s} value={String(s)}>{namesBySlot[s] || t("templates.templateNumber", { n: s })}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="default" onClick={() => duplicateSlot(Number(activeSlot), Number(dupSlot))} disabled={dupSlot === activeSlot || busy}>
              <Check className="h-4 w-4 mr-1" /> {t("common.duplicate", { defaultValue: "Duplicar" })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDupSlot(null)}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
          </div>
        )}
      </div>

      <Tabs value={activeSlot} onValueChange={setActiveSlot}>
        {SLOTS.map((slot) => {
          const tpl = tpls.find((tp) => tp.slot === slot);
          const items = tpl ? (itemsByTpl[tpl.id] ?? []) : [];
          const notes = notesBySlot[slot] ?? {};
          return (
            <TabsContent key={slot} value={String(slot)} className="space-y-4">
              <Card><CardContent className="p-4 space-y-3">
                <div>
                  <Label>{t("templates.program.templateName")}</Label>
                  <Input className="mt-1" value={namesBySlot[slot] ?? ""} onChange={(e) => setNamesBySlot({ ...namesBySlot, [slot]: e.target.value })} onBlur={(e) => renameSlot(slot, e.target.value)} />
                </div>

                <KindBlock title={t("templates.program.studiesTitle")} kind="study" tplId={tpl?.id} items={items} onAdd={() => addItem(slot, "study")} onUpdate={updateDraft} onRemove={removeItem} dayLabel={DAY_LABEL} />
                <KindBlock title={t("templates.program.mealsTitle")} kind="meal" tplId={tpl?.id} items={items} onAdd={() => addItem(slot, "meal")} onUpdate={updateDraft} onRemove={removeItem} dayLabel={DAY_LABEL} />

                <div className="border rounded-lg p-3 space-y-2">
                  <h3 className="text-sm font-semibold">{t("templates.program.mealNotesTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("templates.program.mealNotesHelp")}</p>
                  <div>
                    <Label className="text-xs">{t("templates.program.generalObservations")}</Label>
                    <Textarea
                      className="mt-1 text-red-600 dark:text-red-400"
                      placeholder={t("templates.program.generalObservationsPlaceholder")}
                      value={genObsBySlot[slot] ?? ""}
                      maxLength={4000}
                      onChange={(e) => setGenObsBySlot({ ...genObsBySlot, [slot]: e.target.value })}
                      onBlur={async (e) => {
                        const v = e.target.value;
                        const r = await fnUpsert({ data: { slot, name: namesBySlot[slot] || `Modelo ${slot}`, general_observations: v || null } });
                        if (!r.ok) toast.error(r.error);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t("templates.program.generalObservationsHint")}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DAY_OPTS.map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <div className="text-xs font-medium w-24 shrink-0 text-muted-foreground">{DAY_LABEL[d]}</div>
                        <Input
                          className="h-9 flex-1"
                          placeholder={t("templates.program.mealNotesPlaceholder")}
                          value={notes[String(d)] ?? ""}
                          onChange={(e) => setNotesBySlot({ ...notesBySlot, [slot]: { ...(notesBySlot[slot] ?? {}), [String(d)]: e.target.value } })}
                          onBlur={(e) => saveMealNote(slot, String(d), e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <KindBlock title={t("templates.program.transportTitle")} kind="transport" tplId={tpl?.id} items={items} onAdd={() => addItem(slot, "transport")} onUpdate={updateDraft} onRemove={removeItem} dayLabel={DAY_LABEL} />

                <Button className="w-full" onClick={() => saveItems(slot)} disabled={busy}>
                  <Save className="h-4 w-4 mr-1" /> {t("templates.program.saveTemplate")}
                </Button>
              </CardContent></Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function KindBlock({ title, kind, tplId, items, onAdd, onUpdate, onRemove, dayLabel }: {
  title: string; kind: Kind; tplId: string | undefined; items: ItemDraft[];
  onAdd: () => void;
  onUpdate: (tplId: string, idx: number, patch: Partial<ItemDraft>) => void;
  onRemove: (tplId: string, idx: number) => void;
  dayLabel: Record<number, string>;
}) {
  const { t } = useTranslation();
  const filtered = items.map((it, i) => ({ it, i })).filter(({ it }) => it.kind === kind);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-3 w-3 mr-1" />{t("common.add")}</Button>
      </div>
      {filtered.length === 0 && <p className="text-xs text-muted-foreground">{t("templates.program.noItems")}</p>}
      <div className="space-y-2">
        {filtered.map(({ it, i }) => (
          <div key={i} className="bg-muted/30 rounded-md p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Select value={String(it.day_offset)} onValueChange={(v) => tplId && onUpdate(tplId, i, { day_offset: Number(v) })}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{DAY_OPTS.map((d) => <SelectItem key={d} value={String(d)}>{dayLabel[d]}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex-1" />
              <Button size="icon" variant="ghost" onClick={() => tplId && onRemove(tplId, i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
            <PayloadEditor kind={kind} payload={it.payload} onChange={(p) => tplId && onUpdate(tplId, i, { payload: p })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PayloadEditor({ kind, payload, onChange }: { kind: Kind; payload: Payload; onChange: (p: Payload) => void }) {
  const { t } = useTranslation();
  const set = (k: string, v: PayloadValue) => onChange({ ...payload, [k]: v });
  if (kind === "study") return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={String(payload.period ?? "Manhã")} onValueChange={(v) => set("period", v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="Manhã">{t("templates.program.study.morning")}</SelectItem><SelectItem value="Tarde">{t("templates.program.study.afternoon")}</SelectItem></SelectContent>
      </Select>
      <Input className="h-9" type="time" value={String(payload.meeting_time ?? "")} onChange={(e) => set("meeting_time", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder={t("templates.program.study.meetingPoint")} value={String(payload.meeting_point ?? "")} onChange={(e) => set("meeting_point", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder={t("templates.program.study.companion")} value={String(payload.acompanhante ?? "")} onChange={(e) => set("acompanhante", e.target.value)} />
      <Select value={String(payload.acompanhante_for ?? "")} onValueChange={(v) => set("acompanhante_for", v)}>
        <SelectTrigger className="h-9 col-span-2"><SelectValue placeholder={t("templates.program.study.companionFor")} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="superintendente">{t("templates.program.study.superintendent")}</SelectItem>
          <SelectItem value="esposa">{t("templates.program.study.wife")}</SelectItem>
          <SelectItem value="sc_substituto">{t("templates.program.study.scSub")}</SelectItem>
          <SelectItem value="esposa_sc_substituto">{t("templates.program.study.wifeScSub")}</SelectItem>
          <SelectItem value="sc_pastor">{t("templates.program.study.scPastor")}</SelectItem>
          <SelectItem value="esposa_sc_pastor">{t("templates.program.study.wifeScPastor")}</SelectItem>
        </SelectContent>
      </Select>
      <Input className="h-9 col-span-2" placeholder={t("templates.program.study.contactPhone")} value={String(payload.contact_phone ?? "")} onChange={(e) => set("contact_phone", e.target.value)} />
    </div>
  );
  if (kind === "meal") return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={String(payload.type ?? "lunch")} onValueChange={(v) => set("type", v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="breakfast">{t("templates.program.meal.breakfast")}</SelectItem>
          <SelectItem value="lunch">{t("templates.program.meal.lunch")}</SelectItem>
          <SelectItem value="dinner">{t("templates.program.meal.dinner")}</SelectItem>
        </SelectContent>
      </Select>
      <Input className="h-9" type="time" value={String(payload.meal_time ?? "")} onChange={(e) => set("meal_time", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder={t("templates.program.meal.host")} value={String(payload.host_name ?? "")} onChange={(e) => set("host_name", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder={t("templates.program.meal.location")} value={String(payload.location ?? "")} onChange={(e) => set("location", e.target.value)} />
    </div>
  );
  return <TransportEditor payload={payload} onChange={onChange} />;
}

const EVENT_TYPES = ["field_service", "congregation_meeting", "pioneer_meeting", "elders_meeting", "home_return", "other"] as const;
const DIRECTIONS = ["pickup", "dropoff", "round_trip"] as const;

interface TransportEvent {
  event_type?: string;
  event_type_other?: string;
  direction?: string;
  departure_time?: string;
  return_time?: string;
  driver_name?: string;
  contact_phone?: string;
  notes?: string;
}

function parseEvents(payload: Payload): TransportEvent[] {
  const raw = payload.events_json;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr as TransportEvent[];
    } catch { /* ignore */ }
  }
  // Legacy single-event fallback
  if (payload.event_type || payload.direction || payload.departure_time || payload.return_time || payload.driver_name) {
    return [{
      event_type: String(payload.event_type ?? "field_service"),
      event_type_other: String(payload.event_type_other ?? ""),
      direction: String(payload.direction ?? "round_trip"),
      departure_time: String(payload.departure_time ?? ""),
      return_time: String(payload.return_time ?? ""),
      driver_name: String(payload.driver_name ?? ""),
      contact_phone: String(payload.contact_phone ?? ""),
      notes: String(payload.notes ?? ""),
    }];
  }
  return [];
}

function TransportEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const { t } = useTranslation();
  const set = (k: string, v: PayloadValue) => onChange({ ...payload, [k]: v });
  const events = parseEvents(payload);
  const allDay = !!payload.all_day;
  const updateEvents = (next: TransportEvent[]) => onChange({ ...payload, events_json: JSON.stringify(next) });
  const updateEvent = (idx: number, patch: Partial<TransportEvent>) => updateEvents(events.map((e, i) => i === idx ? { ...e, ...patch } : e));
  const addEvent = () => updateEvents([...events, { event_type: "field_service", direction: "round_trip", departure_time: "", return_time: "", driver_name: "", contact_phone: "", notes: "" }]);
  const removeEvent = (idx: number) => updateEvents(events.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allDay} onChange={(e) => set("all_day", e.target.checked)} />
        {t("templates.program.transport.allDay")}
      </label>

      <div className="space-y-2">
        {events.map((ev, idx) => {
          const evType = String(ev.event_type ?? "field_service");
          const showDriver = !allDay || idx === 0;
          return (
            <div key={idx} className="border rounded-md p-2 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("templates.program.transport.eventLabel", { n: idx + 1, defaultValue: `Evento ${idx + 1}` })}</span>
                {events.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeEvent(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("templates.program.transport.eventType")}</label>
                  <Select value={evType} onValueChange={(v) => updateEvent(idx, { event_type: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((k) => <SelectItem key={k} value={k}>{t(`templates.program.transport.eventTypes.${k}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("templates.program.transport.direction")}</label>
                  <Select value={String(ev.direction ?? "round_trip")} onValueChange={(v) => updateEvent(idx, { direction: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map((k) => <SelectItem key={k} value={k}>{t(`templates.program.transport.directions.${k}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {evType === "other" && (
                  <Input className="h-9 col-span-2" placeholder={t("templates.program.transport.otherPlaceholder")}
                    value={String(ev.event_type_other ?? "")} onChange={(e) => updateEvent(idx, { event_type_other: e.target.value })} />
                )}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("templates.program.transport.departure")}</label>
                  <Input className="h-9" type="time" value={String(ev.departure_time ?? "")} onChange={(e) => updateEvent(idx, { departure_time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("templates.program.transport.return")}</label>
                  <Input className="h-9" type="time" value={String(ev.return_time ?? "")} onChange={(e) => updateEvent(idx, { return_time: e.target.value })} />
                </div>
                {showDriver && (
                  <>
                    <Input className="h-9 col-span-2" placeholder={t("templates.program.transport.driverName")} value={String(ev.driver_name ?? "")} onChange={(e) => updateEvent(idx, { driver_name: e.target.value })} />
                    <Input className="h-9 col-span-2" placeholder={t("templates.program.transport.phone")} value={String(ev.contact_phone ?? "")} onChange={(e) => updateEvent(idx, { contact_phone: e.target.value })} />
                    <Input className="h-9 col-span-2" placeholder={t("templates.program.transport.notes")} value={String(ev.notes ?? "")} onChange={(e) => updateEvent(idx, { notes: e.target.value })} />
                  </>
                )}
              </div>
            </div>
          );
        })}
        <Button size="sm" variant="outline" className="w-full" onClick={addEvent}>
          <Plus className="h-3 w-3 mr-1" />{t("templates.program.transport.addEvent", { defaultValue: "Adicionar evento" })}
        </Button>
      </div>
    </div>
  );
}
