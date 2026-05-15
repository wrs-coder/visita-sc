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
import { Plus, Trash2, Copy, Pencil, Compass, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120, "Nome muito longo (máx. 120)");

export const Route = createFileRoute("/_app/modelo-reunioes-de-campo")({ component: Page });

type Modality = (typeof FIELD_MODALITIES)[number];
interface TemplateRow { id: string; name: string; congregation_id: string | null; modality: Modality; }
interface CongRow { id: string; name: string; }

const MAX = 24;

function Page() {
  const { role } = useAuth();
  const fnList = useServerFn(listFieldMeetingTemplates);
  const fnCreate = useServerFn(createFieldMeetingTemplate);
  const fnUpdate = useServerFn(updateFieldMeetingTemplate);
  const fnLink = useServerFn(linkFieldMeetingTemplate);
  const fnDup = useServerFn(duplicateFieldMeetingTemplate);
  const fnDel = useServerFn(deleteFieldMeetingTemplate);
  const fnCongs = useServerFn(listMyCongregations);

  const [tpls, setTpls] = useState<TemplateRow[]>([]);
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
      if (!activeId && r.templates.length > 0) setActiveId(r.templates[0].id);
    }
    if (c.ok) setCongs(c.data as CongRow[]);
  }, [fnList, fnCongs, activeId]);

  useEffect(() => { load(); }, [load]);

  if (role !== "superintendent") {
    return <Card><CardContent className="p-6 text-sm">Acesso restrito ao superintendente.</CardContent></Card>;
  }

  const active = tpls.find((t) => t.id === activeId) ?? null;

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

  const usedCongIds = new Set(tpls.filter((t) => t.congregation_id && t.id !== active?.id).map((t) => t.congregation_id!));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6" />Modelo Reuniões de Campo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina a modalidade de pregação e vincule cada modelo a uma congregação. {tpls.length}/{MAX} modelos.
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
              <div>
                <Label>Modalidade de pregação</Label>
                <Select value={newModality} onValueChange={(v) => setNewModality(v as Modality)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{FIELD_MODALITY_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {FIELD_MODALITY_LABELS[t.modality]} · {cong ? cong.name : "sem congregação"}
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

              <div>
                <Label className="text-xs">Modalidade de pregação</Label>
                <Select value={active.modality} onValueChange={handleChangeModality}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{FIELD_MODALITY_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando a modalidade não for "Pregação de casa em casa", apenas o campo "Oração final" ficará disponível para a congregação.
                </p>
              </div>

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
              </div>
            </CardContent></Card>
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
