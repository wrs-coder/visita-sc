import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { listMyCongregations, createCongregation, updateCongregation } from "@/lib/congregations.functions";
import { listMyElders, updateElderBySuper, deleteElderBySuper, resetElderPasswordBySuper } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Trash2, Pencil, Check, KeyRound, Copy, Users, UserCog } from "lucide-react";
import { toast } from "sonner";

interface Elder {
  user_id: string;
  full_name: string;
  phone: string;
  congregation_id: string | null;
  congregation_name: string;
  elder_position: string | null;
}

const POSITION_LABELS: Record<string, string> = {
  coordenador: "Coordenador",
  secretario: "Secretário",
  sup_servico: "Sup. de Serviço",
  corpo: "Corpo de Anciãos",
};

interface Congregation {
  id: string;
  name: string;
  invite_code: string;
  superintendent_id: string;
  is_active?: boolean;
}

export const Route = createFileRoute("/_app/congregacoes")({ component: Page });

function Page() {
  const { user, role, profile, refresh } = useAuth();
  const nav = useNavigate();
  const fnList = useServerFn(listMyCongregations);
  const fnCreate = useServerFn(createCongregation);
  const fnUpdate = useServerFn(updateCongregation);
  const fnElders = useServerFn(listMyElders);
  const fnUpdateElder = useServerFn(updateElderBySuper);
  const fnDeleteElder = useServerFn(deleteElderBySuper);
  const fnResetPwd = useServerFn(resetElderPasswordBySuper);
  const [list, setList] = useState<Congregation[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ name: "", invite_code: "" });
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [editingElder, setEditingElder] = useState<Elder | null>(null);
  const [pwdElder, setPwdElder] = useState<Elder | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const isSuper = role === "superintendent";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const res = await fnList();
    if (res.ok) setList(res.data as Congregation[]);
    else toast.error(res.error);
    const er = await fnElders();
    if (er.ok) setElders(er.data as Elder[]);
    setLoading(false);
  }, [user, fnList, fnElders]);

  useEffect(() => { load(); }, [load]);

  if (!isSuper) {
    return <div className="p-6 text-sm text-muted-foreground">Apenas o superintendente acessa esta página.</div>;
  }

  const create = async () => {
    if (!user) return;
    const name = form.name.trim();
    const code = form.invite_code.trim().toUpperCase();
    if (name.length < 2) { toast.error("Informe o nome da congregação"); return; }
    if (!/^[A-Z0-9]{4,12}$/.test(code)) { toast.error("Código deve ter 4-12 caracteres (letras/números)"); return; }
    setBusy(true);
    const res = await fnCreate({ data: { name, inviteCode: code } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Congregação criada");
    setForm({ name: "", invite_code: "" });
    setOpenNew(false);
    if (!profile?.congregation_id && res.data) {
      await supabase.from("profiles").update({ congregation_id: res.data.id }).eq("id", user.id);
      await refresh();
    }
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    const code = editing.invite_code.trim().toUpperCase();
    if (name.length < 2) { toast.error("Nome inválido"); return; }
    if (!/^[A-Z0-9]{4,12}$/.test(code)) { toast.error("Código inválido"); return; }
    setBusy(true);
    const res = await fnUpdate({ data: { id: editing.id, name, inviteCode: code } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Atualizado");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta congregação? Os dados de visitas relacionadas serão perdidos.")) return;
    const { error } = await supabase.from("congregations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (profile?.congregation_id === id && user) {
      await supabase.from("profiles").update({ congregation_id: null }).eq("id", user.id);
      await refresh();
    }
    toast.success("Excluída");
    load();
  };

  const setActive = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ congregation_id: id }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await refresh();
    toast.success("Congregação ativa atualizada");
    nav({ to: "/dashboard" });
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };

  const activeCount = list.filter((c) => c.is_active !== false).length;

  const toggleActive = async (c: Congregation, next: boolean) => {
    if (next && activeCount >= 9 && c.is_active === false) {
      toast.error("Limite de 9 congregações ativas atingido. Desative outra antes.");
      return;
    }
    const { error } = await supabase.from("congregations").update({ is_active: next }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Congregações</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeCount}/9 congregações ativas no circuito.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova congregação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Congregação Central" /></div>
              <div>
                <Label>Código de acesso dos anciãos</Label>
                <Input className="mt-1 font-mono uppercase" value={form.invite_code} onChange={(e) => setForm({ ...form, invite_code: e.target.value.toUpperCase() })} placeholder="Ex: CENTRAL01" maxLength={12} />
                <p className="text-xs text-muted-foreground mt-1">4-12 caracteres, letras e números. Único no sistema.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button onClick={create} disabled={busy}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <Card><CardContent className="p-4 text-sm text-muted-foreground">Carregando…</CardContent></Card>}

      {!loading && list.length === 0 && (
        <Card><CardContent className="p-6 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">Nenhuma congregação cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione a primeira congregação do circuito para começar.</p>
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {list.map((c) => {
          const active = profile?.congregation_id === c.id;
          const isActive = c.is_active !== false;
          return (
            <Card key={c.id} className={`shadow-card ${!isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Building2 className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {c.name}
                    {active && <span className="text-[10px] uppercase font-bold bg-success text-success-foreground px-1.5 py-0.5 rounded">Atual</span>}
                    {!isActive && <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inativa</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <KeyRound className="h-3 w-3" />
                    <code className="font-mono tracking-wider">{c.invite_code}</code>
                    <button onClick={() => copy(c.invite_code)} className="hover:text-primary"><Copy className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={isActive} onCheckedChange={(v) => toggleActive(c, v)} aria-label="Ativa" />
                  {!active && isActive && <Button size="sm" variant="outline" onClick={() => setActive(c.id)}><Check className="h-3.5 w-3.5 mr-1" />Usar</Button>}
                  <Button size="icon" variant="ghost" onClick={() => setEditing({ ...c })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar congregação</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input className="mt-1" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>Código de acesso</Label>
                <Input className="mt-1 font-mono uppercase" value={editing.invite_code} onChange={(e) => setEditing({ ...editing, invite_code: e.target.value.toUpperCase() })} maxLength={12} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
