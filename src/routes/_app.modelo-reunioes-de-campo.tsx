import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listFieldMeetingTemplates,
  createFieldMeetingTemplate,
  updateFieldMeetingTemplate,
  linkFieldMeetingTemplate,
  duplicateFieldMeetingTemplate,
  deleteFieldMeetingTemplate,
  replaceFieldMeetingTemplateItems,
  FIELD_MODALITIES,
  FIELD_MODALITY_LABELS,
} from "@/lib/field-meeting-templates.functions";
import { listMyCongregations } from "@/lib/congregations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Pencil, Compass, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120, "Nome muito longo (máx. 120)");

export const Route = createFileRoute("/_app/modelo-reunioes-de-campo")({ component: Page });

type Modality = (typeof FIELD_MODALITIES)[number];
interface TemplateRow { id: string; name: string; congregation_id: string | null; modality: Modality; }
interface CongRow { id: string; name: string; }
interface ItemDraft {
  day_offset: number;
  period: string;
  modality: Modality;
  meeting_time: string;
  territory_number: string;
  territory_location: string;
  closing_prayer: string;
}

const MAX = 24;
const DAY_OPTS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABEL: Record<number, string> = { 0: "Ter (1º dia)", 1: "Qua", 2: "Qui", 3: "Sex", 4: "Sáb", 5: "Dom", 6: "Seg" };

function Page() {
  const { role } = useAuth();
  const fnList = useServerFn(listFieldMeetingTemplates);
  const fnCreate = useServerFn(createFieldMeetingTemplate);
  const fnUpdate = useServerFn(updateFieldMeetingTemplate);
  const fnLink = useServerFn(linkFieldMeetingTemplate);
  const fnDup = useServerFn(duplicateFieldMeetingTemplate);
  const fnDel = useServerFn(deleteFieldMeetingTemplate);
  const fnReplace = useServerFn(replaceFieldMeetingTemplateItems);
  const fnCongs = useServerFn(listMyCongregations);

  const [tpls, setTpls] = useState<TemplateRow[]>([]);
  const [itemsByTpl, setItemsByTpl] = useState<Record<string, ItemDraft[]>>({});
  const [congs, setCongs] = useState<CongRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newModality, setNewModality] = useState<Modality>("casa_em_casa");
  const [newNameErr, setNewNameErr] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [renameErr, setRenameErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([fnList(), fnCongs()]);
    if (r.ok) {
      setTpls(r.templates as TemplateRow[]);
      const map: Record<string, ItemDraft[]> = {};
      for (const t of r.templates) map[t.id] = [];
      for (const it of r.items) {
        map[it.template_id] = map[it.template_id] || [];
        map[it.template_id].push({
          day_offset: it.day_offset,
          period: it.period || "Manhã",
          modality: ((it as { modality?: Modality }).modality) ?? "casa_em_casa",
          meeting_time: it.meeting_time ?? "",
          territory_number: it.territory_number ?? "",
          territory_location: it.territory_location ?? "",
          closing_prayer: it.closing_prayer ?? "",
        });
      }
      setItemsByTpl(map);
      if (!activeId && r.templates.length > 0) setActiveId(r.templates[0].id);
    }
    if (c.ok) setCongs(c.data as CongRow[]);
  }, [fnList, fnCongs, activeId]);

  useEffect(() => { load(); }, [load]);

  if (role !== "superintendent") {
    return <Card><CardContent className="p-6 text-sm">Acesso restrito ao superintendente.</CardContent></Card>;
  }

  const active = tpls.find((t) => t.id === activeId) ?? null;
  const items = activeId ? itemsByTpl[activeId] ?? [] : [];

  const setItems = (next: ItemDraft[]) => {
    if (!activeId) return;
    setItemsByTpl((m) => ({ ...m, [activeId]: next }));
  };

  const handleCreate = async () => {
    const parsed = nameSchema.safeParse(newName);
    if (!parsed.success) { setNewNameErr(parsed.error.issues[0].message); return; }
    setNewNameErr(null);
    if (tpls.length >= MAX) { toast.error(`Limite de ${MAX} modelos atingido.`); return; }
    setBusy(true);
    const r = await fnCreate({ data: { name: parsed.data, modality: newModality } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modelo criado");
    setCreateOpen(false);
    setNewName("");
    setNewModality("casa_em_casa");
    setActiveId(r.id);
    await load();
  };

  const handleRename = async () => {
    if (!active) return;
    const parsed = nameSchema.safeParse(renameVal);
    if (!parsed.success) { setRenameErr(parsed.error.issues[0].message); return; }
    setRenameErr(null);
    setBusy(true);
    const r = await fnUpdate({ data: { id: active.id, name: parsed.data } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Renomeado");
    setRenameOpen(false);
    await load();
  };

  const handleChangeModality = async (val: string) => {
    if (!active) return;
    const r = await fnUpdate({ data: { id: active.id, modality: val as Modality } });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modalidade atualizada");
    await load();
  };

  const handleLink = async (val: string) => {
    if (!active) return;
    const congregationId = val === "__none__" ? null : val;
    const r = await fnLink({ data: { id: active.id, congregationId } });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Vínculo atualizado");
    await load();
  };

  const handleDuplicate = async () => {
    if (!active) return;
    setBusy(true);
    const r = await fnDup({ data: { id: active.id, name: `${active.name} (cópia)` } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modelo duplicado");
    setActiveId(r.id);
    await load();
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!confirm(`Excluir o modelo "${active.name}"?`)) return;
    setBusy(true);
    const r = await fnDel({ data: { id: active.id } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Excluído");
    setActiveId(null);
    await load();
  };

  const addItem = () => setItems([...items, { day_offset: 0, period: "Manhã", modality: "casa_em_casa", meeting_time: "", territory_number: "", territory_location: "", closing_prayer: "" }]);
  const updateItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSaveItems = async () => {
    if (!activeId) return;
    setBusy(true);
    const r = await fnReplace({
      data: {
        templateId: activeId,
        items: items.map((it, i) => ({
          day_offset: it.day_offset,
          period: it.period,
          modality: it.modality,
          meeting_time: it.meeting_time || null,
          territory_number: it.territory_number || null,
          territory_location: it.territory_location || null,
          closing_prayer: it.closing_prayer || null,
          sort_order: i,
        })),
      },
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Itens salvos");
  };

  const usedCongIds = new Set(tpls.filter((t) => t.congregation_id && t.id !== active?.id).map((t) => t.congregation_id!));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6" />Modelo Reuniões de Campo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina a modalidade, os turnos com dia/horário e vincule a uma congregação. {tpls.length}/{MAX} modelos.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={tpls.length >= MAX}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo modelo de reuniões de campo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  className={`mt-1 ${newNameErr ? "border-destructive" : ""}`}
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); if (newNameErr) setNewNameErr(null); }}
                  placeholder="Ex: Cong. Centro"
                  maxLength={120}
                />
                {newNameErr && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{newNameErr}</p>}
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={busy}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card><CardContent className="p-3 space-y-1">
          {tpls.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">Nenhum modelo ainda.</div>
          ) : tpls.map((t) => {
            const cong = congs.find((c) => c.id === t.congregation_id);
            return (
              <button key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${activeId === t.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                <div className="truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {cong ? cong.name : "sem congregação"}
                </div>
              </button>
            );
          })}
        </CardContent></Card>

        <div className="space-y-4">
          {!active ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
              Selecione um modelo ou crie um novo.
            </CardContent></Card>
          ) : (
            <>
              <Card><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold truncate">{active.name}</div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setRenameVal(active.name); setRenameOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Renomear
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={busy || tpls.length >= MAX}>
                      <Copy className="h-3.5 w-3.5 mr-1" />Duplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={busy}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Cada turno tem sua própria modalidade. Quando a modalidade não for "Pregação de casa em casa", apenas o campo "Oração final" ficará disponível para a congregação naquele turno.
                </p>

                <div>
                  <Label className="text-xs">Vincular à congregação</Label>
                  <Select value={active.congregation_id ?? "__none__"} onValueChange={handleLink}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem vínculo</SelectItem>
                      {congs.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={usedCongIds.has(c.id)}>
                          {c.name}{usedCongIds.has(c.id) ? " (já vinculada)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ao criar uma visita para a congregação vinculada, estes turnos serão aplicados automaticamente.
                  </p>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Turnos do modelo</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Turno</Button>
                    <Button size="sm" onClick={handleSaveItems} disabled={busy}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Nenhum turno. Adicione dias/horários para esta congregação.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={String(it.day_offset)} onValueChange={(v) => updateItem(idx, { day_offset: Number(v) })}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>{DAY_OPTS.map((d) => <SelectItem key={d} value={String(d)}>{DAY_LABEL[d]}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={it.period} onValueChange={(v) => updateItem(idx, { period: v })}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manhã">Manhã</SelectItem>
                              <SelectItem value="Tarde">Tarde</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="time" value={it.meeting_time} onChange={(e) => updateItem(idx, { meeting_time: e.target.value })} className="h-8 w-28" />
                          <div className="flex-1" />
                          <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div>
                          <Label className="text-xs">Modalidade</Label>
                          <Select value={it.modality} onValueChange={(v) => updateItem(idx, { modality: v as Modality })}>
                            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_MODALITIES.map((m) => (
                                <SelectItem key={m} value={m}>{FIELD_MODALITY_LABELS[m]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {it.modality === "casa_em_casa" && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="N° território S-13" value={it.territory_number} onChange={(e) => updateItem(idx, { territory_number: e.target.value })} className="h-8" />
                            <Input placeholder="Localização do território" value={it.territory_location} onChange={(e) => updateItem(idx, { territory_location: e.target.value })} className="h-8" />
                          </div>
                        )}
                        <Input placeholder="Oração final" value={it.closing_prayer} onChange={(e) => updateItem(idx, { closing_prayer: e.target.value })} className="h-8" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={(o) => { setRenameOpen(o); if (!o) setRenameErr(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Renomear modelo</DialogTitle></DialogHeader>
          <div>
            <Input
              value={renameVal}
              onChange={(e) => { setRenameVal(e.target.value); if (renameErr) setRenameErr(null); }}
              maxLength={120}
              className={renameErr ? "border-destructive" : ""}
            />
            {renameErr && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{renameErr}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleRename} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
