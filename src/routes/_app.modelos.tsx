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
import { Plus, Trash2, FileStack, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/modelos")({ component: Page });

type Kind = "study" | "meal" | "transport";
type PayloadValue = string | number | boolean | null;
type Payload = Record<string, PayloadValue>;
interface ItemDraft { kind: Kind; day_offset: number; payload: Payload; sort_order: number; }
interface TemplateRow { id: string; slot: number; name: string; meal_day_notes?: Record<string, string> | null }
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
  const [activeSlot, setActiveSlot] = useState("1");
  const [busy, setBusy] = useState(false);

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
    for (const t of r.templates) {
      names[t.slot] = t.name;
      const raw = (t as TemplateRow).meal_day_notes;
      notesMap[t.slot] = (raw && typeof raw === "object" ? raw : {}) as Record<string, string>;
    }
    setNamesBySlot(names);
    setNotesBySlot(notesMap);
  }, [fnList]);

  useEffect(() => { load(); }, [load]);

  if (role !== "superintendent") return <Card><CardContent className="p-6 text-sm">Acesso restrito ao superintendente.</CardContent></Card>;

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
    else { toast.success("Modelo salvo"); load(); }
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
      : { driver_name: "", contact_phone: "", description: "", notes: "" };
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

      <div className="flex items-center gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("templates.program.templateLabel")}</Label>
        <Select value={activeSlot} onValueChange={setActiveSlot}>
          <SelectTrigger className="h-9 max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SLOTS.map((s) => <SelectItem key={s} value={String(s)}>{namesBySlot[s] || t("templates.templateNumber", { n: s })}</SelectItem>)}
          </SelectContent>
        </Select>
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
  const set = (k: string, v: PayloadValue) => onChange({ ...payload, [k]: v });
  if (kind === "study") return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={String(payload.period ?? "Manhã")} onValueChange={(v) => set("period", v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="Manhã">Manhã</SelectItem><SelectItem value="Tarde">Tarde</SelectItem></SelectContent>
      </Select>
      <Input className="h-9" type="time" value={String(payload.meeting_time ?? "")} onChange={(e) => set("meeting_time", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder="Local de encontro" value={String(payload.meeting_point ?? "")} onChange={(e) => set("meeting_point", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder="Acompanhante para estudos" value={String(payload.acompanhante ?? "")} onChange={(e) => set("acompanhante", e.target.value)} />
      <Select value={String(payload.acompanhante_for ?? "")} onValueChange={(v) => set("acompanhante_for", v)}>
        <SelectTrigger className="h-9 col-span-2"><SelectValue placeholder="Acompanhante para…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="superintendente">Superintendente</SelectItem>
          <SelectItem value="esposa">Esposa do superintendente</SelectItem>
          <SelectItem value="sc_substituto">S.C Substituto</SelectItem>
          <SelectItem value="esposa_sc_substituto">Esposa do S.C Substituto</SelectItem>
          <SelectItem value="sc_pastor">S.C Pastor</SelectItem>
          <SelectItem value="esposa_sc_pastor">Esposa do S.C Pastor</SelectItem>
        </SelectContent>
      </Select>
      <Input className="h-9 col-span-2" placeholder="Telefone de contato" value={String(payload.contact_phone ?? "")} onChange={(e) => set("contact_phone", e.target.value)} />
    </div>
  );
  if (kind === "meal") return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={String(payload.type ?? "lunch")} onValueChange={(v) => set("type", v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="breakfast">Café</SelectItem>
          <SelectItem value="lunch">Almoço</SelectItem>
          <SelectItem value="dinner">Jantar</SelectItem>
        </SelectContent>
      </Select>
      <Input className="h-9" type="time" value={String(payload.meal_time ?? "")} onChange={(e) => set("meal_time", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder="Anfitrião" value={String(payload.host_name ?? "")} onChange={(e) => set("host_name", e.target.value)} />
      <Input className="h-9 col-span-2" placeholder="Local" value={String(payload.location ?? "")} onChange={(e) => set("location", e.target.value)} />
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input className="h-9 col-span-2" placeholder="Nome do motorista" value={String(payload.driver_name ?? "")} onChange={(e) => set("driver_name", e.target.value)} />
      <Input className="h-9" placeholder="Telefone" value={String(payload.contact_phone ?? "")} onChange={(e) => set("contact_phone", e.target.value)} />
      <Input className="h-9" placeholder="Descrição/evento" value={String(payload.description ?? "")} onChange={(e) => set("description", e.target.value)} />
    </div>
  );
}
