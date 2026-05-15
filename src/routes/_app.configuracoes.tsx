import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { seedDefaultChecklist } from "@/lib/auth.functions";
import { listMyCongregations } from "@/lib/congregations.functions";
import { listTemplates, applyTemplateToVisit } from "@/lib/templates.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, KeyRound, Calendar, Check, Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/configuracoes")({ component: Page });

interface Visit { id: string; title: string; start_date: string; end_date: string; is_active: boolean; congregation_id: string; }
interface Cong { id: string; name: string; invite_code: string; superintendent_id: string; }

function Page() {
  const { congregation, role, profile, refresh, user } = useAuth();
  const seedFn = useServerFn(seedDefaultChecklist);
  const fnList = useServerFn(listMyCongregations);
  const fnTpls = useServerFn(listTemplates);
  const fnApply = useServerFn(applyTemplateToVisit);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [congs, setCongs] = useState<Cong[]>([]);
  const [tpls, setTpls] = useState<{ id: string; slot: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", start_date: "", end_date: "", congregation_id: "", template_id: "" });
  const isSuper = role === "superintendent";

  const loadCongs = useCallback(async () => {
    if (!isSuper) return;
    const res = await fnList();
    if (res.ok) setCongs(res.data as Cong[]);
    const tr = await fnTpls();
    if (tr.ok) setTpls(tr.templates);
  }, [isSuper, fnList, fnTpls]);

  useEffect(() => { loadCongs(); }, [loadCongs]);

  useEffect(() => {
    if (!isSuper && !congregation) return;
    const load = async () => {
      let q = supabase.from("visits").select("*").order("start_date", { ascending: false });
      if (isSuper && congs.length > 0) q = q.in("congregation_id", congs.map((c) => c.id));
      else if (congregation) q = q.eq("congregation_id", congregation.id);
      const { data } = await q;
      setVisits((data ?? []) as Visit[]);
    };
    load();
    const ch = supabase.channel(`v-all`).on("postgres_changes", { event: "*", schema: "public", table: "visits" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [congregation, isSuper, congs]);

  const openNew = () => {
    setForm({ title: "", start_date: "", end_date: "", congregation_id: congregation?.id ?? congs[0]?.id ?? "", template_id: "" });
    setOpen(true);
  };

  const create = async () => {
    if (!form.congregation_id) { toast.error("Selecione a congregação"); return; }
    if (!form.title || !form.start_date || !form.end_date) { toast.error("Preencha todos os campos"); return; }
    await supabase.from("visits").update({ is_active: false }).eq("congregation_id", form.congregation_id);
    const { data, error } = await supabase.from("visits").insert({ congregation_id: form.congregation_id, title: form.title, start_date: form.start_date, end_date: form.end_date, is_active: true }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Falha"); return; }
    await seedFn({ data: { visitId: data.id } });
    if (form.template_id) {
      const r = await fnApply({ data: { visitId: data.id, templateId: form.template_id } });
      if (!r.ok) toast.error("Falha ao aplicar modelo: " + r.error);
    }
    if (user && profile?.congregation_id !== form.congregation_id) {
      await supabase.from("profiles").update({ congregation_id: form.congregation_id }).eq("id", user.id);
      await refresh();
    }
    toast.success("Visita criada");
    setOpen(false);
  };

  const setActive = async (id: string) => {
    const v = visits.find((x) => x.id === id);
    if (!v) return;
    await supabase.from("visits").update({ is_active: false }).eq("congregation_id", v.congregation_id);
    await supabase.from("visits").update({ is_active: true }).eq("id", id);
    if (user && profile?.congregation_id !== v.congregation_id) {
      await supabase.from("profiles").update({ congregation_id: v.congregation_id }).eq("id", user.id);
      await refresh();
    }
    toast.success("Visita ativa atualizada");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir visita e todos os dados relacionados?")) return;
    const { error } = await supabase.from("visits").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const copyCode = () => {
    if (!congregation) return;
    navigator.clipboard.writeText(congregation.invite_code);
    toast.success("Código copiado");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>

      <Card><CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sua congregação</div>
        <div className="text-lg font-semibold mt-1">{congregation?.name ?? "—"}</div>
        <div className="text-xs text-muted-foreground mt-1">Você é {role === "superintendent" ? "Superintendente" : "Ancião"}</div>
      </CardContent></Card>

      {isSuper && congregation && (
        <Card><CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><KeyRound className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Código de convite para anciãos</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-2xl font-bold font-mono tracking-widest text-primary">{congregation.invite_code}</code>
                <Button size="sm" variant="outline" onClick={copyCode}>Copiar</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Compartilhe esse código com os anciãos para que entrem na congregação.</p>
            </div>
          </div>
        </CardContent></Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Visitas</h2>
        {isSuper && (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova visita</Button>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova visita</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Congregação</Label>
                  <Select value={form.congregation_id} onValueChange={(v) => setForm({ ...form, congregation_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {congs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {congs.length === 0 && <p className="text-xs text-muted-foreground mt-1">Cadastre uma congregação antes de criar a visita.</p>}
                </div>
                <div><Label>Título</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Visita Out/2025" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início (terça)</Label><Input type="date" className="mt-1" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>Fim (domingo)</Label><Input type="date" className="mt-1" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Modelo de programação (opcional)</Label>
                  <Select value={form.template_id || "none"} onValueChange={(v) => setForm({ ...form, template_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sem modelo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Não aplicar modelo —</SelectItem>
                      {tpls.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {tpls.length === 0 && <p className="text-xs text-muted-foreground mt-1">Crie um modelo em "Modelos" para aplicá-lo aqui.</p>}
                </div>
                <Button className="w-full" onClick={create}>Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {visits.length === 0 && <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhuma visita cadastrada.</CardContent></Card>}
        {visits.map((v) => {
          const cong = congs.find((c) => c.id === v.congregation_id);
          return (
            <Card key={v.id} className="shadow-card"><CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">{v.title} {v.is_active && <span className="text-[10px] uppercase font-bold bg-success text-success-foreground px-1.5 py-0.5 rounded">Ativa</span>}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" />{cong?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{format(parseISO(v.start_date), "d MMM", { locale: ptBR })} – {format(parseISO(v.end_date), "d MMM yyyy", { locale: ptBR })}</div>
              </div>
              {isSuper && <div className="flex gap-1">
                {!v.is_active && <Button size="sm" variant="outline" onClick={() => setActive(v.id)}><Check className="h-3.5 w-3.5 mr-1" />Ativar</Button>}
                <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>}
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}
