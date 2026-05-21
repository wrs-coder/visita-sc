import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyCongregations } from "@/lib/congregations.functions";
import { listTemplates, applyTemplateToVisit } from "@/lib/templates.functions";
import {
  applyFieldMeetingTemplateForVisit,
  listFieldMeetingTemplates,
} from "@/lib/field-meeting-templates.functions";
import {
  applyChecklistTemplateForVisit,
  listChecklistTemplates,
} from "@/lib/checklist-templates.functions";
import {
  listMeetingTalkTemplates,
  applyMeetingTalkTemplateForVisit,
} from "@/lib/meeting-talk-templates.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, KeyRound, Calendar, Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/configuracoes")({ component: Page });

const VISIT_TITLE_OPTIONS = [
  "Visita",
  "Visita + Pastoreio",
  "Visita + Treinamento SCS",
  "Visita SCS",
] as const;

interface Visit {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  congregation_id: string;
  checklist_template_id?: string | null;
  field_meeting_template_id?: string | null;
  template_id?: string | null;
  substitute_name?: string | null;
  substitute_phone?: string | null;
}
interface Cong {
  id: string;
  name: string;
  invite_code: string;
  superintendent_id: string;
}

function Page() {
  const { congregation, role, profile } = useAuth();
  const fnList = useServerFn(listMyCongregations);
  const fnTpls = useServerFn(listTemplates);
  const fnApply = useServerFn(applyTemplateToVisit);
  const fnApplyField = useServerFn(applyFieldMeetingTemplateForVisit);
  const fnApplyChecklist = useServerFn(applyChecklistTemplateForVisit);
  const fnListField = useServerFn(listFieldMeetingTemplates);
  const fnListChecklist = useServerFn(listChecklistTemplates);
  const fnListMeetingTalk = useServerFn(listMeetingTalkTemplates);
  const fnApplyMeetingTalk = useServerFn(applyMeetingTalkTemplateForVisit);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [congs, setCongs] = useState<Cong[]>([]);
  const [tpls, setTpls] = useState<{ id: string; slot: number; name: string }[]>([]);
  const [checklistTpls, setChecklistTpls] = useState<{ id: string; name: string }[]>([]);
  const [fieldTpls, setFieldTpls] = useState<{ id: string; name: string }[]>([]);
  const [meetingTalkTpls, setMeetingTalkTpls] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "Visita" as string,
    start_date: "",
    end_date: "",
    congregation_id: "",
    template_id: "",
    checklist_template_id: "",
    field_template_id: "",
    meeting_talk_template_id: "",
    substitute_name: "",
    substitute_phone: "",
  });
  const isSuper = role === "superintendent";

  const loadCongs = useCallback(async () => {
    if (!isSuper) return;
    const res = await fnList();
    if (res.ok) setCongs(res.data as Cong[]);
    const tr = await fnTpls();
    if (tr.ok) setTpls(tr.templates);
    const cr = await fnListChecklist();
    if (cr.ok)
      setChecklistTpls(
        ((cr as { templates?: { id: string; name: string }[] }).templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
        })),
      );
    const fr = await fnListField();
    if (fr.ok)
      setFieldTpls(
        ((fr as { templates?: { id: string; name: string }[] }).templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
        })),
      );
    const mr = await fnListMeetingTalk();
    if (mr.ok)
      setMeetingTalkTpls(
        ((mr as { templates?: { id: string; name: string }[] }).templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
        })),
      );
  }, [isSuper, fnList, fnTpls, fnListChecklist, fnListField, fnListMeetingTalk]);

  useEffect(() => {
    loadCongs();
  }, [loadCongs]);

  useEffect(() => {
    if (!isSuper && !congregation) return;
    const load = async () => {
      let q = supabase.from("visits").select("*").order("start_date", { ascending: false });
      if (isSuper && congs.length > 0)
        q = q.in(
          "congregation_id",
          congs.map((c) => c.id),
        );
      else if (congregation) q = q.eq("congregation_id", congregation.id);
      const { data } = await q;
      setVisits((data ?? []) as Visit[]);
    };
    load();
    const ch = supabase
      .channel(`v-all`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [congregation, isSuper, congs]);

  const openNew = () => {
    setEditId(null);
    setForm({
      title: "Visita",
      start_date: "",
      end_date: "",
      congregation_id: congregation?.id ?? congs[0]?.id ?? "",
      template_id: "",
      checklist_template_id: "",
      field_template_id: "",
      meeting_talk_template_id: "",
      substitute_name: "",
      substitute_phone: "",
    });
    setOpen(true);
  };

  const openEdit = (v: Visit) => {
    setEditId(v.id);
    setForm({
      title: VISIT_TITLE_OPTIONS.includes(v.title as typeof VISIT_TITLE_OPTIONS[number])
        ? v.title
        : "Visita",
      start_date: v.start_date,
      end_date: v.end_date,
      congregation_id: v.congregation_id,
      template_id: "",
      checklist_template_id: "",
      field_template_id: "",
      meeting_talk_template_id: "",
      substitute_name: v.substitute_name ?? "",
      substitute_phone: v.substitute_phone ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.congregation_id) {
      toast.error("Selecione a congregação");
      return;
    }
    if (!form.title || !form.start_date || !form.end_date) {
      toast.error("Preencha todos os campos");
      return;
    }
    const isScs = form.title === "Visita SCS";
    // Em criações novas, modelos são obrigatórios — exceto para "Visita SCS".
    if (!editId && !isScs) {
      if (!form.template_id) { toast.error("Selecione o Modelo de Programação"); return; }
      if (!form.checklist_template_id) { toast.error("Selecione o Modelo de Checklist"); return; }
      if (!form.field_template_id) { toast.error("Selecione o Modelo de Reuniões de Campo"); return; }
      if (!form.meeting_talk_template_id) { toast.error("Selecione o Modelo de Reunião e Discurso"); return; }
    }
    if (editId) {
      const { error } = await supabase
        .from("visits")
        .update({
          title: form.title,
          start_date: form.start_date,
          end_date: form.end_date,
          congregation_id: form.congregation_id,
          substitute_name: isScs ? (form.substitute_name || null) : null,
          substitute_phone: isScs ? (form.substitute_phone || null) : null,
          ...(form.meeting_talk_template_id ? { meeting_talk_template_id: form.meeting_talk_template_id } : {}),
        })
        .eq("id", editId);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (form.template_id) {
        const r = await fnApply({ data: { visitId: editId, templateId: form.template_id } });
        if (!r.ok) toast.error("Falha ao aplicar modelo: " + r.error);
      }
      if (form.checklist_template_id) {
        const r = await fnApplyChecklist({
          data: { visitId: editId, templateId: form.checklist_template_id },
        });
        if (!r.ok) toast.error("Falha ao aplicar modelo de checklist: " + r.error);
      }
      if (form.field_template_id) {
        const r = await fnApplyField({
          data: { visitId: editId, templateId: form.field_template_id },
        });
        if (!r.ok) toast.error("Falha ao aplicar modelo de reuniões de campo: " + r.error);
      }
      if (form.meeting_talk_template_id) {
        const r = await fnApplyMeetingTalk({
          data: { visitId: editId, templateId: form.meeting_talk_template_id },
        });
        if (!r.ok) toast.error("Falha ao aplicar modelo de reunião e discurso: " + r.error);
      }
      toast.success("Visita atualizada");
      setOpen(false);
      return;
    }
    const { data, error } = await supabase
      .from("visits")
      .insert({
        congregation_id: form.congregation_id,
        title: form.title,
        start_date: form.start_date,
        end_date: form.end_date,
        substitute_name: isScs ? (form.substitute_name || null) : null,
        substitute_phone: isScs ? (form.substitute_phone || null) : null,
        ...(form.meeting_talk_template_id ? { meeting_talk_template_id: form.meeting_talk_template_id } : {}),
      })
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Falha");
      return;
    }
    if (form.template_id) {
      const r = await fnApply({ data: { visitId: data.id, templateId: form.template_id } });
      if (!r.ok) toast.error("Falha ao aplicar modelo: " + r.error);
    }
    if (form.checklist_template_id) {
      const r = await fnApplyChecklist({
        data: { visitId: data.id, templateId: form.checklist_template_id },
      });
      if (!r.ok) toast.error("Falha ao aplicar modelo de checklist: " + r.error);
    }
    if (form.field_template_id) {
      const r = await fnApplyField({
        data: { visitId: data.id, templateId: form.field_template_id },
      });
      if (!r.ok) toast.error("Falha ao aplicar modelo de reuniões de campo: " + r.error);
    }
    if (form.meeting_talk_template_id) {
      const r = await fnApplyMeetingTalk({
        data: { visitId: data.id, templateId: form.meeting_talk_template_id },
      });
      if (!r.ok) toast.error("Falha ao aplicar modelo de reunião e discurso: " + r.error);
    }
    toast.success("Visita criada");
    setOpen(false);
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
      <h1 className="text-2xl md:text-3xl font-bold">Itinerário</h1>

      <Card>
        <CardContent className="p-5">
          {isSuper ? (
            <>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Circuito
              </div>
              <div className="text-lg font-semibold mt-1">
                {profile?.circuit?.trim() ? profile.circuit : "Não informado"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Superintendente de Circuito — defina o circuito atual em "Meu perfil".
              </div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Sua congregação
              </div>
              <div className="text-lg font-semibold mt-1">{congregation?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">Você é Ancião</div>
            </>
          )}
        </CardContent>
      </Card>

      {isSuper && congregation && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Código de convite para anciãos
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-2xl font-bold font-mono tracking-widest text-primary">
                    {congregation.invite_code}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyCode}>
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Compartilhe esse código com os anciãos para que entrem na congregação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Visitas
        </h2>
        {isSuper && (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nova visita
            </Button>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editId ? "Editar visita" : "Nova visita"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Congregação</Label>
                  <Select
                    value={form.congregation_id}
                    onValueChange={(v) => setForm({ ...form, congregation_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {congs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {congs.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre uma congregação antes de criar a visita.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Tipo de visita</Label>
                  <Select
                    value={form.title}
                    onValueChange={(v) => setForm({ ...form, title: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIT_TITLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.title === "Visita SCS" && (
                  <div className="grid grid-cols-1 gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                    <div className="text-xs font-medium text-primary">
                      Substituto do Superintendente
                    </div>
                    <div>
                      <Label>Nome do Substituto</Label>
                      <Input
                        className="mt-1"
                        value={form.substitute_name}
                        onChange={(e) => setForm({ ...form, substitute_name: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label>Telefone do Substituto</Label>
                      <Input
                        type="tel"
                        className="mt-1"
                        value={form.substitute_phone}
                        onChange={(e) => setForm({ ...form, substitute_phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início (terça)</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fim (domingo)</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>
                </div>
                {form.title !== "Visita SCS" && (
                <>

                <div>
                  <Label>Modelo de Programação *</Label>
                  <Select
                    value={form.template_id || ""}
                    onValueChange={(v) => setForm({ ...form, template_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tpls.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tpls.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie um modelo em "Modelos" para aplicá-lo aqui.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Modelo de Checklist *</Label>
                  <Select
                    value={form.checklist_template_id || ""}
                    onValueChange={(v) => setForm({ ...form, checklist_template_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {checklistTpls.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {checklistTpls.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie um modelo em "Modelos de Checklist" para aplicá-lo aqui.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Modelo de Reuniões de Campo *</Label>
                  <Select
                    value={form.field_template_id || ""}
                    onValueChange={(v) => setForm({ ...form, field_template_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTpls.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldTpls.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie um modelo em "Modelo Reuniões de Campo" para aplicá-lo aqui.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Modelo de Reunião e Discurso *</Label>
                  <Select
                    value={form.meeting_talk_template_id || ""}
                    onValueChange={(v) => setForm({ ...form, meeting_talk_template_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingTalkTpls.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {meetingTalkTpls.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie um modelo em "Modelos de Reunião e Discurso" para aplicá-lo aqui.
                    </p>
                  )}
                </div>
                </>
                )}
                <Button className="w-full" onClick={submit}>
                  {editId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {visits.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Nenhuma visita cadastrada.
            </CardContent>
          </Card>
        )}
        {visits.map((v) => {
          const cong = congs.find((c) => c.id === v.congregation_id);
          return (
            <Card key={v.id} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{v.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {cong?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(v.start_date), "d MMM", { locale: ptBR })} –{" "}
                    {format(parseISO(v.end_date), "d MMM yyyy", { locale: ptBR })}
                  </div>
                </div>
                {isSuper && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(v.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
