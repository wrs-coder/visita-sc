import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/checklist")({ component: Page });

interface Item { id: string; visit_id: string; title: string; description: string | null; info_text: string | null; link_or_notes: string | null; status: "pending" | "done"; sort_order: number; }

function Page() {
  const { visit } = useActiveVisit();
  const { role, canEdit } = useAuth();
  const canManage = role === "superintendent";
  const [items, setItems] = useState<Item[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

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

  if (!visit) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;

  const update = async (id: string, patch: Partial<Item>) => {
    setSavingId(id);
    setItems((s) => s.map((x) => x.id === id ? { ...x, ...patch } : x));
    const { error } = await supabase.from("checklist_items").update(patch).eq("id", id);
    setSavingId(null);
    if (error) toast.error(error.message);
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("checklist_items").insert({ visit_id: visit.id, title: newTitle.trim(), description: newDesc.trim() || null, sort_order: items.length });
    if (error) toast.error(error.message); else { setNewOpen(false); setNewTitle(""); setNewDesc(""); toast.success("Item adicionado"); }
  };

  const remove = async (id: string) => { const { error } = await supabase.from("checklist_items").delete().eq("id", id); if (error) toast.error(error.message); };

  const done = items.filter((i) => i.status === "done").length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl md:text-3xl font-bold">Checklist da Congregação</h1><p className="text-sm text-muted-foreground mt-1">Dados necessários para a visita</p></div>
        {canManage && <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo item</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo item da checklist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input className="mt-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
              <div><Label>Descrição (opcional)</Label><Textarea rows={2} className="mt-1" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} /></div>
              <Button className="w-full" onClick={addItem}>Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>}
      </div>

      <Card><CardContent className="p-5">
        <div className="flex justify-between items-end mb-2"><div className="text-sm font-medium">Progresso</div><div className="text-sm font-semibold">{done}/{items.length} ({progress}%)</div></div>
        <Progress value={progress} className="h-2" />
      </CardContent></Card>

      {items.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhum item ainda.</CardContent></Card>
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
                    <div className={`font-medium truncate ${it.status === "done" ? "line-through text-muted-foreground" : ""}`}>{it.title}</div>
                    {it.description && <div className="text-xs text-muted-foreground truncate font-normal">{it.description}</div>}
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {savingId === it.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent>
                <div className="space-y-3 pt-1 pb-3">
                  <FieldArea label="Informação (ex: Total de Publicadores)" v={it.info_text ?? ""} onSave={(v) => update(it.id, { info_text: v })} readOnly={!canEdit} />
                  <FieldArea label="Link ou observações" v={it.link_or_notes ?? ""} onSave={(v) => update(it.id, { link_or_notes: v })} readOnly={!canEdit} />
                  {canManage && <Button size="sm" variant="ghost" onClick={() => remove(it.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" />Remover</Button>}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function FieldArea({ label, v, onSave, readOnly = false }: { label: string; v: string; onSave: (val: string) => void; readOnly?: boolean }) {
  const [val, setVal] = useState(v);
  useEffect(() => setVal(v), [v]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} value={val} readOnly={readOnly} onChange={(e) => setVal(e.target.value)} onBlur={() => { if (!readOnly && val !== v) onSave(val); }} className="mt-1" />
    </div>
  );
}
