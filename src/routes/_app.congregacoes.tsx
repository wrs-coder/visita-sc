import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyCongregations,
  createCongregation,
  updateCongregation,
} from "@/lib/congregations.functions";
import {
  listMyElders,
  updateElderBySuper,
  deleteElderBySuper,
  resetElderPasswordBySuper,
} from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Building2, Trash2, Pencil, KeyRound, Copy, Users, UserCog, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Pequeno cartão para o superintendente visualizar/copiar a senha que um ancião
// cadastrado criou para a aba "Anciãos" (Missão 1).
function ElderTabPasswordReveal({ password }: { password: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-2 py-1.5">
      <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        Senha Anciãos
      </span>
      <code className="text-xs font-mono flex-1 truncate">
        {show ? password : "•".repeat(Math.min(password.length, 10))}
      </code>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        title={show ? "Ocultar" : "Mostrar"}
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        title="Copiar"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(password);
            toast.success("Senha copiada.");
          } catch {
            toast.error("Não foi possível copiar.");
          }
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface Elder {
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  username: string | null;
  congregation_id: string | null;
  congregation_name: string;
  elder_position: string | null;
  elder_tab_password_is_creator?: boolean;
  elder_tab_password?: string | null;
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
  const { user, role } = useAuth();
  const { t } = useTranslation();

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

  useEffect(() => {
    load();
  }, [load]);

  if (!isSuper) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Apenas o superintendente acessa esta página.
      </div>
    );
  }

  const create = async () => {
    if (!user) return;
    const name = form.name.trim();
    const code = form.invite_code.trim().toUpperCase();
    if (name.length < 2) {
      toast.error("Informe o nome da congregação");
      return;
    }
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      toast.error("Código deve ter 4-12 caracteres (letras/números)");
      return;
    }
    setBusy(true);
    const res = await fnCreate({ data: { name, inviteCode: code } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Congregação criada");
    setForm({ name: "", invite_code: "" });
    setOpenNew(false);
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    const code = editing.invite_code.trim().toUpperCase();
    if (name.length < 2) {
      toast.error("Nome inválido");
      return;
    }
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      toast.error("Código inválido");
      return;
    }
    setBusy(true);
    const res = await fnUpdate({ data: { id: editing.id, name, inviteCode: code } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Atualizado");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta congregação? Os dados de visitas relacionadas serão perdidos."))
      return;
    const { error } = await supabase.from("congregations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Excluída");
    load();
  };

  // A seleção da congregação ativa foi centralizada no Dashboard.
  // Esta tela serve apenas para cadastro, edição e ativação/inativação.

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };

  const activeCount = list.filter((c) => c.is_active !== false).length;

  const toggleActive = async (c: Congregation, next: boolean) => {
    const { error } = await supabase
      .from("congregations")
      .update({ is_active: next })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> {t("congregations.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount === 1
              ? t("congregations.activeOne", { count: activeCount })
              : t("congregations.activeMany", { count: activeCount })}
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> {t("common.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("congregations.newCongregation")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{t("congregations.name")}</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("congregations.namePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("congregations.accessCode")}</Label>
                <Input
                  className="mt-1 font-mono uppercase"
                  value={form.invite_code}
                  onChange={(e) => setForm({ ...form, invite_code: e.target.value.toUpperCase() })}
                  placeholder={t("congregations.accessCodePlaceholder")}
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("congregations.accessCodeHint")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={create} disabled={busy}>
                {busy ? t("congregations.creating") : t("congregations.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{t("congregations.loading")}</CardContent>
        </Card>
      )}

      {!loading && list.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">{t("congregations.noneRegistered")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("congregations.addFirst")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2 list-optimized-sm">
        {list.map((c) => {
          const isActive = c.is_active !== false;
          return (
            <Card key={c.id} className={`shadow-card ${!isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {c.name}
                    {!isActive && (
                      <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {t("congregations.inactive")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <KeyRound className="h-3 w-3" />
                    <code className="font-mono tracking-wider">{c.invite_code}</code>
                    <button onClick={() => copy(c.invite_code)} className="hover:text-primary">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(v) => toggleActive(c, v)}
                    aria-label={t("congregations.active")}
                  />
                  <Button size="icon" variant="ghost" onClick={() => setEditing({ ...c })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ----- Anciãos cadastrados ----- */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("congregations.eldersRegistered")}</h2>
          <span className="text-xs text-muted-foreground">({elders.length})</span>
        </div>
        {elders.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {t("congregations.noElders")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((c) => {
              const group = elders.filter((e) => e.congregation_id === c.id);
              if (group.length === 0) return null;
              return (
                <Card key={`elders-${c.id}`} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      {c.name}
                    </div>
                    <div className="space-y-2">
                      {group.map((e) => (
                        <div
                          key={e.user_id}
                          className="flex flex-col gap-2 p-2 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <UserCog className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{e.full_name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {POSITION_LABELS[e.elder_position ?? ""] ?? e.elder_position ?? "—"}
                                {e.phone && <> · {e.phone}</>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Redefinir senha"
                                onClick={() => {
                                  setPwdElder(e);
                                  setNewPwd("");
                                }}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar"
                                onClick={() => setEditingElder({ ...e })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Excluir"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Excluir o ancião "${e.full_name}"? Esta ação é permanente.`,
                                    )
                                  )
                                    return;
                                  const r = await fnDeleteElder({ data: { elderUserId: e.user_id } });
                                  if (!r.ok) {
                                    toast.error(r.error);
                                    return;
                                  }
                                  toast.success("Ancião excluído");
                                  load();
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          {(e.username || e.email) && (
                            <div className="pl-12 -mt-1 space-y-1 text-xs">
                              {e.username && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="shrink-0">Usuário:</span>
                                  <span className="font-mono text-foreground truncate">@{e.username}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    title="Copiar usuário"
                                    onClick={() => {
                                      navigator.clipboard.writeText(e.username ?? "");
                                      toast.success("Usuário copiado");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {e.email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="shrink-0">E-mail:</span>
                                  <span className="text-foreground break-all">{e.email}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    title="Copiar e-mail"
                                    onClick={() => {
                                      navigator.clipboard.writeText(e.email ?? "");
                                      toast.success("E-mail copiado");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          {e.elder_tab_password_is_creator && e.elder_tab_password && (
                            <ElderTabPasswordReveal password={e.elder_tab_password} />
                          )}

                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit elder dialog */}
      <Dialog open={!!editingElder} onOpenChange={(o) => !o && setEditingElder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar ancião</DialogTitle>
          </DialogHeader>
          {editingElder && (
            <div className="space-y-3">
              <div>
                <Label>Nome completo</Label>
                <Input
                  className="mt-1"
                  value={editingElder.full_name}
                  onChange={(e) => setEditingElder({ ...editingElder, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  className="mt-1"
                  value={editingElder.phone}
                  onChange={(e) => setEditingElder({ ...editingElder, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Designação</Label>
                <Select
                  value={editingElder.elder_position ?? ""}
                  onValueChange={(v) => setEditingElder({ ...editingElder, elder_position: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="secretario">Secretário</SelectItem>
                    <SelectItem value="sup_servico">Sup. de Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingElder(null)}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!editingElder) return;
                const pos = editingElder.elder_position;
                if (pos !== "coordenador" && pos !== "secretario" && pos !== "sup_servico") {
                  toast.error("Selecione uma designação válida");
                  return;
                }
                setBusy(true);
                const r = await fnUpdateElder({
                  data: {
                    elderUserId: editingElder.user_id,
                    fullName: editingElder.full_name.trim(),
                    phone: editingElder.phone.trim(),
                    position: pos,
                  },
                });
                setBusy(false);
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success("Ancião atualizado");
                setEditingElder(null);
                load();
              }}
            >
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!pwdElder} onOpenChange={(o) => !o && setPwdElder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          {pwdElder && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Definindo nova senha para <strong>{pwdElder.full_name}</strong>.
              </p>
              <div>
                <Label>Nova senha</Label>
                <Input
                  type="text"
                  className="mt-1"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdElder(null)}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!pwdElder) return;
                if (newPwd.length < 6) {
                  toast.error("Senha deve ter pelo menos 6 caracteres");
                  return;
                }
                setBusy(true);
                const r = await fnResetPwd({
                  data: { elderUserId: pwdElder.user_id, newPassword: newPwd },
                });
                setBusy(false);
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success("Senha redefinida");
                setPwdElder(null);
                setNewPwd("");
              }}
            >
              {busy ? "Redefinindo..." : "Redefinir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar congregação</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  className="mt-1"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Código de acesso</Label>
                <Input
                  className="mt-1 font-mono uppercase"
                  value={editing.invite_code}
                  onChange={(e) =>
                    setEditing({ ...editing, invite_code: e.target.value.toUpperCase() })
                  }
                  maxLength={12}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
