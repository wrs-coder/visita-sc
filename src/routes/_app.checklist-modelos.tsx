import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listChecklistTemplates,
  createChecklistTemplate,
  renameChecklistTemplate,
  duplicateChecklistTemplate,
  deleteChecklistTemplate,
  replaceChecklistTemplateItems,
} from "@/lib/checklist-templates.functions";
import { exportChecklistTemplate, importChecklistTemplate } from "@/lib/template-io.functions";
import { TemplateIOButtons } from "@/components/TemplateIOButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Pencil, Save, ArrowUp, ArrowDown, ListChecks, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120, "Nome muito longo (máx. 120)");
const itemTitleSchema = z.string().trim().min(1, "Título obrigatório").max(300, "Título muito longo (máx. 300)");
const itemDescSchema = z.string().trim().max(2000, "Descrição muito longa (máx. 2000)");

export const Route = createFileRoute("/_app/checklist-modelos")({ component: Page });

interface TemplateRow { id: string; name: string; congregation_id: string | null; }
interface ItemRow { id: string; template_id: string; title: string; description: string | null; sort_order: number; }
interface CongRow { id: string; name: string; }
interface ItemDraft { title: string; description: string; }

const MAX = 24;

function Page() {
  const { role } = useAuth();
  const fnList = useServerFn(listChecklistTemplates);
  const fnCreate = useServerFn(createChecklistTemplate);
  const fnRename = useServerFn(renameChecklistTemplate);
  const fnDup = useServerFn(duplicateChecklistTemplate);
  const fnDel = useServerFn(deleteChecklistTemplate);
  const fnReplace = useServerFn(replaceChecklistTemplateItems);
  const fnExport = useServerFn(exportChecklistTemplate);
  const fnImport = useServerFn(importChecklistTemplate);

  const [tpls, setTpls] = useState<TemplateRow[]>([]);
  const [itemsByTpl, setItemsByTpl] = useState<Record<string, ItemDraft[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameErr, setNewNameErr] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [renameErr, setRenameErr] = useState<string | null>(null);
  const [itemErrs, setItemErrs] = useState<Record<number, { title?: string; description?: string }>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fnList();
    if (r.ok) {
      setTpls(r.templates as TemplateRow[]);
      const map: Record<string, ItemDraft[]> = {};
      for (const t of r.templates) map[t.id] = [];
      for (const it of r.items as ItemRow[]) {
        map[it.template_id] = map[it.template_id] || [];
        map[it.template_id].push({ title: it.title, description: it.description ?? "" });
      }
      setItemsByTpl(map);
      if (!activeId && r.templates.length > 0) setActiveId(r.templates[0].id);
    }
  }, [fnList, activeId]);

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
    const r = await fnCreate({ data: { name: parsed.data } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modelo criado");
    setCreateOpen(false);
    setNewName("");
    setActiveId(r.id);
    await load();
  };

  const handleRename = async () => {
    if (!active) return;
    const parsed = nameSchema.safeParse(renameVal);
    if (!parsed.success) { setRenameErr(parsed.error.issues[0].message); return; }
    setRenameErr(null);
    setBusy(true);
    const r = await fnRename({ data: { id: active.id, name: parsed.data } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Renomeado");
    setRenameOpen(false);
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
    const name = `${active.name} (cópia)`;
    setBusy(true);
    const r = await fnDup({ data: { id: active.id, name } });
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

  const handleSaveItems = async () => {
    if (!activeId) return;
    const errs: Record<number, { title?: string; description?: string }> = {};
    items.forEach((it, idx) => {
      const t = itemTitleSchema.safeParse(it.title);
      const d = itemDescSchema.safeParse(it.description);
      const e: { title?: string; description?: string } = {};
      if (!t.success) e.title = t.error.issues[0].message;
      if (!d.success) e.description = d.error.issues[0].message;
      if (e.title || e.description) errs[idx] = e;
    });
    if (Object.keys(errs).length > 0) {
      setItemErrs(errs);
      toast.error("Corrija os campos destacados antes de salvar.");
      return;
    }
    setItemErrs({});
    const cleaned = items
      .map((it) => ({ title: it.title.trim(), description: it.description.trim() }))
      .filter((it) => it.title.length > 0);
    if (cleaned.length === 0) {
      if (!confirm("Salvar modelo sem itens?")) return;
    }
    setBusy(true);
    const r = await fnReplace({
      data: {
        templateId: activeId,
        items: cleaned.map((it, i) => ({
          title: it.title,
          description: it.description || null,
          sort_order: (i + 1) * 10,
        })),
      },
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Itens salvos");
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    setItems(next);
  };

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems([...items, { title: "", description: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const usedCongIds = new Set(tpls.filter((t) => t.congregation_id && t.id !== active?.id).map((t) => t.congregation_id!));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6" />Modelos de Checklist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie checklists e aplique a cada visita pelo Itinerário. {tpls.length}/{MAX} modelos.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {role === "superintendent" && (
            <TemplateIOButtons
              filenameBase={active?.name ?? "checklist-modelo"}
              disabled={!active}
              onExport={async () => active ? fnExport({ data: { id: active.id } }) : { ok: false, error: "Selecione um modelo" }}
              onImport={async (file) => { const r = await fnImport({ data: { file: file as never } }); if (r.ok) await load(); return r; }}
            />
          )}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={tpls.length >= MAX}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo modelo de checklist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  className={`mt-1 ${newNameErr ? "border-destructive" : ""}`}
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); if (newNameErr) setNewNameErr(null); }}
                  placeholder="Ex: Padrão 2026"
                  maxLength={120}
                />
                {newNameErr && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{newNameErr}</p>}
                <p className="text-xs text-muted-foreground mt-1">{newName.trim().length}/120 caracteres</p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={busy}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card><CardContent className="p-3 space-y-1">
          {tpls.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">Nenhum modelo ainda.</div>
          ) : tpls.map((t) => {
            return (
              <button key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${activeId === t.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                <div className="truncate">{t.name}</div>
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
                  Escolha este modelo no Itinerário ao criar ou editar uma visita para aplicá-lo àquela semana.
                </p>
              </CardContent></Card>

              <Card><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Itens da checklist</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Item</Button>
                    <Button size="sm" onClick={handleSaveItems} disabled={busy}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Nenhum item. Adicione perguntas ou tópicos para esta checklist.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="border rounded-md p-3 space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="text-xs font-medium text-muted-foreground pt-2 w-6">{idx + 1}.</div>
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Título do item"
                              value={it.title}
                              onChange={(e) => { updateItem(idx, { title: e.target.value }); if (itemErrs[idx]?.title) setItemErrs((s) => ({ ...s, [idx]: { ...s[idx], title: undefined } })); }}
                              maxLength={300}
                              className={itemErrs[idx]?.title ? "border-destructive" : ""}
                            />
                            {itemErrs[idx]?.title && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{itemErrs[idx]?.title}</p>}
                            <Textarea
                              rows={2}
                              placeholder="Descrição (opcional)"
                              value={it.description}
                              onChange={(e) => { updateItem(idx, { description: e.target.value }); if (itemErrs[idx]?.description) setItemErrs((s) => ({ ...s, [idx]: { ...s[idx], description: undefined } })); }}
                              maxLength={2000}
                              className={itemErrs[idx]?.description ? "border-destructive" : ""}
                            />
                            {itemErrs[idx]?.description && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{itemErrs[idx]?.description}</p>}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
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
            <p className="text-xs text-muted-foreground mt-1">{renameVal.trim().length}/120 caracteres</p>
          </div>
          <DialogFooter>
            <Button onClick={handleRename} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
