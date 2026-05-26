import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Check, Trash2, Loader2, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";
import { offlineUpdate, offlineInsert, offlineDelete } from "@/lib/offline-supabase";
import { saveBlob } from "@/lib/share";

export const Route = createFileRoute("/_app/checklist")({ component: Page });

interface Item { id: string; visit_id: string; title: string; description: string | null; info_text: string | null; link_or_notes: string | null; status: "pending" | "done"; sort_order: number; }

function Page() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const { t } = useTranslation();
  const canManage = role === "superintendent";
  const [items, setItems] = useState<Item[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editEnabled, setEditEnabled] = useState(false);
  const editAllowed = !canManage || editEnabled;

  useEffect(() => {
    if (!visit) return;
    const load = async () => {
      const { data } = await supabase.from("checklist_items").select("*").eq("visit_id", visit.id).order("sort_order").order("created_at");
      setItems((data ?? []) as Item[]);
    };
    load();
    const ch = supabase.channel(`chk-${visit.id}`).on("postgres_changes", { event: "*", schema: "public", table: "checklist_items", filter: `visit_id=eq.${visit.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [visit]);

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("checklistPage.noActiveVisit")}</CardContent></Card>;

  const update = async (id: string, patch: Partial<Item>) => {
    setSavingId(id);
    setItems((s) => s.map((x) => x.id === id ? { ...x, ...patch } : x));
    const { error, queued } = await offlineUpdate("checklist_items", patch, { id });
    setSavingId(null);
    if (error) toast.error(error.message);
    else if (queued) toast.success(t("checklistPage.savedOfflineHint"));
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;
    const { error, queued } = await offlineInsert("checklist_items", { visit_id: visit.id, title: newTitle.trim(), description: newDesc.trim() || null, sort_order: items.length });
    if (error) toast.error(error.message); else { setNewOpen(false); setNewTitle(""); setNewDesc(""); toast.success(queued ? t("common.savedOffline") : t("checklistPage.added")); }
  };

  const remove = async (id: string) => { const { error } = await offlineDelete("checklist_items", { id }); if (error) toast.error(error.message); };

  const saveEdit = async () => {
    if (!editItem) return;
    if (!editItem.title.trim()) { toast.error(t("checklistPage.titleRequired")); return; }
    const { error, queued } = await offlineUpdate("checklist_items", { title: editItem.title.trim(), description: editItem.description?.trim() || null }, { id: editItem.id });
    if (error) toast.error(error.message); else { toast.success(queued ? t("common.savedOffline") : t("checklistPage.updated")); setEditItem(null); }
  };

  const done = items.filter((i) => i.status === "done").length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div><h1 className="text-2xl md:text-3xl font-bold">{t("checklistPage.title")}</h1><p className="text-sm text-muted-foreground mt-1">{t("checklistPage.subtitle")}</p></div>
        <div className="flex gap-2 flex-wrap">
          {canManage && (
            <Button variant="outline" onClick={() => exportCsv(items, visit.title, t)}>
              <Download className="h-4 w-4 mr-1" />{t("checklistPage.exportSheet")}
            </Button>
          )}
          {canManage && <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{t("checklistPage.newItem")}</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{t("checklistPage.newItemDialogTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t("checklistPage.itemTitle")}</Label><Input className="mt-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
                <div><Label>{t("checklistPage.descriptionOptional")}</Label><Textarea rows={2} className="mt-1" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} /></div>
                <Button className="w-full" onClick={addItem}>{t("checklistPage.add")}</Button>
              </div>
            </DialogContent>
          </Dialog>}
        </div>
      </div>

      {canManage && <SupervisorEditToggle enabled={editEnabled} onChange={setEditEnabled} />}

      <fieldset disabled={!editAllowed} className="space-y-5 disabled:opacity-70 min-w-0 border-0 p-0 m-0">
      <Card><CardContent className="p-5">
        <div className="flex justify-between items-end mb-2"><div className="text-sm font-medium">{t("checklistPage.progress")}</div><div className="text-sm font-semibold">{done}/{items.length} ({progress}%)</div></div>
        <Progress value={progress} className="h-2" />
      </CardContent></Card>

      {items.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{t("checklistPage.noItems")}</CardContent></Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {items.map((it) => (
            <AccordionItem key={it.id} value={it.id} className="bg-card border rounded-lg shadow-card px-4 data-[state=open]:shadow-elevated">
              <div className="flex items-center gap-3">
                <button
                  disabled={!canEdit}
                  onClick={(e) => { e.stopPropagation(); if (canEdit) update(it.id, { status: it.status === "done" ? "pending" : "done" }); }}
                  className={`shrink-0 h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${it.status === "done" ? "bg-success border-success" : "border-muted-foreground/30 hover:border-primary"} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {it.status === "done" && <Check className="h-3.5 w-3.5 text-success-foreground" />}
                </button>
                <AccordionTrigger className="flex-1 hover:no-underline py-3">
                  <div className="text-left flex-1 min-w-0">
                    <div className={`font-medium break-words ${it.status === "done" ? "line-through text-muted-foreground" : ""}`}>{it.title}</div>
                    {it.description && <div className="text-xs text-muted-foreground break-words font-normal">{it.description}</div>}
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {savingId === it.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent>
                <div className="space-y-3 pt-1 pb-3">
                  <FieldArea label={t("checklistPage.infoLabel")} v={it.info_text ?? ""} onSave={(v) => update(it.id, { info_text: v })} readOnly={!canEdit} />
                  <FieldArea label={t("checklistPage.linkNotesLabel")} v={it.link_or_notes ?? ""} onSave={(v) => update(it.id, { link_or_notes: v })} readOnly={!canEdit} />
                  {canManage && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditItem(it)}><Pencil className="h-3.5 w-3.5 mr-1" />{t("checklistPage.edit")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(it.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" />{t("checklistPage.remove")}</Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      </fieldset>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("checklistPage.editTitle")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div><Label>{t("checklistPage.itemTitle")}</Label><Input className="mt-1" value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} /></div>
              <div><Label>{t("checklistPage.description")}</Label><Textarea rows={3} className="mt-1" value={editItem.description ?? ""} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} /></div>
              <Button className="w-full" onClick={saveEdit}>{t("checklistPage.save")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldArea({ label, v, onSave, readOnly = false }: { label: string; v: string; onSave: (val: string) => void; readOnly?: boolean }) {
  const { t } = useTranslation();
  const [val, setVal] = useState(v);
  useEffect(() => setVal(v), [v]);
  const dirty = val !== v;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} value={val} readOnly={readOnly} onChange={(e) => setVal(e.target.value)} className="mt-1" />
      {!readOnly && dirty && (
        <div className="flex justify-end mt-1">
          <Button size="sm" onClick={() => onSave(val)}>{v ? t("checklistPage.saveChanges") : t("checklistPage.save")}</Button>
        </div>
      )}
    </div>
  );
}

function csvEscape(v: string) {
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function exportCsv(items: Item[], visitTitle: string, t: (k: string) => string) {
  const header = [t("checklistPage.exportItem"), t("checklistPage.exportDescription"), t("checklistPage.exportStatus"), t("checklistPage.exportInfo"), t("checklistPage.exportLinkNotes")];
  const rows = items.map((it) => [
    it.title,
    it.description ?? "",
    it.status === "done" ? t("checklistPage.exportDone") : t("checklistPage.exportPending"),
    it.info_text ?? "",
    it.link_or_notes ?? "",
  ]);
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map((c) => csvEscape(String(c))).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const filename = `checklist-${visitTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  void saveBlob(blob, {
    filename,
    mimeType: "text/csv",
    pickerTypes: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
  });
}
