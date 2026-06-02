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
import {
  listElderProgramTemplates,
  applyElderProgramTemplateToVisit,
} from "@/lib/elder-program-templates.functions";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, KeyRound, Calendar, Building2, Pencil, UserCheck, Phone } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline-supabase";
import { useTranslation } from "react-i18next";
import { maskPhone } from "@/lib/masks";
import { SavingIndicator } from "@/components/SavingIndicator";

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
  const { t } = useTranslation();
  const fnList = useServerFn(listMyCongregations);
  const fnTpls = useServerFn(listTemplates);
  const fnApply = useServerFn(applyTemplateToVisit);
  const fnApplyField = useServerFn(applyFieldMeetingTemplateForVisit);
  const fnApplyChecklist = useServerFn(applyChecklistTemplateForVisit);
  const fnListField = useServerFn(listFieldMeetingTemplates);
  const fnListChecklist = useServerFn(listChecklistTemplates);
  const fnListMeetingTalk = useServerFn(listMeetingTalkTemplates);
  const fnApplyMeetingTalk = useServerFn(applyMeetingTalkTemplateForVisit);
  const fnListElderProgram = useServerFn(listElderProgramTemplates);
  const fnApplyElderProgram = useServerFn(applyElderProgramTemplateToVisit);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [congs, setCongs] = useState<Cong[]>([]);
  const [tpls, setTpls] = useState<{ id: string; slot: number; name: string }[]>([]);
  const [checklistTpls, setChecklistTpls] = useState<{ id: string; name: string }[]>([]);
  const [fieldTpls, setFieldTpls] = useState<{ id: string; name: string }[]>([]);
  const [meetingTalkTpls, setMeetingTalkTpls] = useState<{ id: string; name: string }[]>([]);
  const [elderProgramTpls, setElderProgramTpls] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "Visita" as string,
    start_date: "",
    end_date: "",
    congregation_id: "",
    template_id: "",
    checklist_template_id: "",
    field_template_id: "",
    meeting_talk_template_id: "",
    elder_program_template_id: "",
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
    const er = await fnListElderProgram();
    if (er.ok)
      setElderProgramTpls(
        ((er as { templates?: { id: string; name: string }[] }).templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
        })),
      );
  }, [isSuper, fnList, fnTpls, fnListChecklist, fnListField, fnListMeetingTalk, fnListElderProgram]);

  useEffect(() => {
    loadCongs();
  }, [loadCongs]);

  useEffect(() => {
    if (!isSuper && !congregation) return;
    const load = async () => {
      let q = supabase.from("visits").select("*").order("start_date", { ascending: true });
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
    const congId = congregation?.id ?? congs[0]?.id ?? "";
    // Mission 2: default start_date to the first Tuesday AFTER the last visit
    // across ALL congregations in the itinerary (not scoped to selected one).
    // Uses end_date when available, otherwise start_date. Fallback: today.
    const toIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    const tuesdayAfter = (base: Date) => {
      const d = new Date(base);
      // getDay(): 0=Sun..6=Sat — Tuesday = 2. Strictly after base.
      const diff = ((2 - d.getDay() + 7) % 7) || 7;
      d.setDate(d.getDate() + diff);
      return d;
    };
    const lastIso = visits.length
      ? visits.reduce((acc, v) => {
          const cand = v.end_date || v.start_date;
          return cand && cand > acc ? cand : acc;
        }, "")
      : "";
    const baseDate = lastIso ? new Date(lastIso + "T00:00:00") : new Date();
    const tue = tuesdayAfter(baseDate);
    const sun = new Date(tue);
    sun.setDate(sun.getDate() + 5);
    setForm({
      title: "Visita",
      start_date: toIso(tue),
      end_date: toIso(sun),
      congregation_id: congId,
      template_id: "",
      checklist_template_id: "",
      field_template_id: "",
      meeting_talk_template_id: "",
      elder_program_template_id: "",
      substitute_name: "",
      substitute_phone: "",
    });
    setOpen(true);
  };

  // Mission 5: ao abrir o diálogo "Nova visita", recalcula a próxima terça
  // com base no snapshot mais recente de `visits` (cobre exclusões e edições
  // que ocorreram após o último abrir).
  useEffect(() => {
    if (!open || editId) return;
    const toIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    const tuesdayAfter = (base: Date) => {
      const d = new Date(base);
      const diff = ((2 - d.getDay() + 7) % 7) || 7;
      d.setDate(d.getDate() + diff);
      return d;
    };
    const lastIso = visits.length
      ? visits.reduce((acc, v) => {
          const cand = v.end_date || v.start_date;
          return cand && cand > acc ? cand : acc;
        }, "")
      : "";
    const baseDate = lastIso ? new Date(lastIso + "T00:00:00") : new Date();
    const tue = tuesdayAfter(baseDate);
    const sun = new Date(tue);
    sun.setDate(sun.getDate() + 5);
    setForm((f) => ({ ...f, start_date: toIso(tue), end_date: toIso(sun) }));
  }, [open, editId, visits]);

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
      elder_program_template_id: "",
      substitute_name: v.substitute_name ?? "",
      substitute_phone: v.substitute_phone ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (submitting) return;
    if (!form.congregation_id) { toast.error("Selecione a congregação"); return; }
    if (!form.title || !form.start_date || !form.end_date) { toast.error("Preencha todos os campos"); return; }
    if (form.end_date < form.start_date) { toast.error("A data final não pode ser anterior à inicial"); return; }
    const isScs = form.title === "Visita SCS";
    if (!editId && !isScs) {
      if (!form.template_id) { toast.error("Selecione o Modelo de Programação"); return; }
      if (!form.checklist_template_id) { toast.error("Selecione o Modelo de Checklist"); return; }
      if (!form.field_template_id) { toast.error("Selecione o Modelo de Reuniões de Campo"); return; }
      if (!form.meeting_talk_template_id) { toast.error("Selecione o Modelo de Reunião e Discurso"); return; }
    }

    setSubmitting(true);
    try {
    const basePayload = {
      title: form.title,
      start_date: form.start_date,
      end_date: form.end_date,
      congregation_id: form.congregation_id,
      substitute_name: isScs ? (form.substitute_name.trim() || null) : null,
      substitute_phone: isScs ? (form.substitute_phone.trim() || null) : null,
      ...(form.meeting_talk_template_id ? { meeting_talk_template_id: form.meeting_talk_template_id } : {}),
    };

    // TRAVA ANTI-DUPLICAÇÃO: se há editId, é UPDATE estrito. Jamais cai em INSERT.
    if (editId) {
      try {
        const res = await offlineUpdate("visits", basePayload, { id: editId });
        if (res.error) { toast.error(res.error.message); return; }
        if (res.queued) {
          toast.success("Visita salva offline — sincronizará quando voltar a ficar online.");
        } else {
          if (form.template_id) {
            const r = await fnApply({ data: { visitId: editId, templateId: form.template_id } });
            if (!r.ok) toast.error("Falha ao aplicar modelo: " + r.error);
            else if ((r.skipped ?? 0) > 0) toast.info(`Modelo aplicado em modo merge: ${r.inserted} novos, ${r.skipped} ignorados (já existiam).`);
          }
          if (form.checklist_template_id) {
            const r = await fnApplyChecklist({ data: { visitId: editId, templateId: form.checklist_template_id } });
            if (!r.ok) toast.error("Falha ao aplicar modelo de checklist: " + r.error);
            else if ((r.skipped ?? 0) > 0) toast.info(`Checklist aplicado em modo merge: ${r.applied} novos, ${r.skipped} ignorados.`);
          }
          if (form.field_template_id) {
            const r = await fnApplyField({ data: { visitId: editId, templateId: form.field_template_id } });
            if (!r.ok) toast.error("Falha ao aplicar modelo de reuniões de campo: " + r.error);
            else if ((r.skipped ?? 0) > 0) toast.info(`Reuniões de campo aplicadas em modo merge: ${r.applied} novas, ${r.skipped} ignoradas.`);
          }
          if (form.meeting_talk_template_id) {
            const r = await fnApplyMeetingTalk({ data: { visitId: editId, templateId: form.meeting_talk_template_id } });
            if (!r.ok) toast.error("Falha ao aplicar modelo de reunião e discurso: " + r.error);
          }
          toast.success("Visita atualizada");
        }
        setOpen(false);
      } catch (err) {
        console.warn("[visit:update] erro", err);
        toast.warning("Ligação instável. Os seus dados continuam guardados em segurança no dispositivo.");
      }
      return;
    }

    // INSERT (novo) — tenta online direto para conseguir o id e aplicar modelos.
    try {
      const { data, error } = await supabase
        .from("visits")
        .insert(basePayload)
        .select()
        .single();
      if (error || !data) {
        const fallback = await offlineInsert("visits", basePayload);
        if (fallback.error) { toast.error(error?.message ?? fallback.error.message); return; }
        toast.success("Visita salva offline — sincronizará quando voltar a ficar online.");
        setOpen(false);
        return;
      }
      if (form.template_id) {
        const r = await fnApply({ data: { visitId: data.id, templateId: form.template_id } });
        if (!r.ok) toast.error("Falha ao aplicar modelo: " + r.error);
      }
      if (form.checklist_template_id) {
        const r = await fnApplyChecklist({ data: { visitId: data.id, templateId: form.checklist_template_id } });
        if (!r.ok) toast.error("Falha ao aplicar modelo de checklist: " + r.error);
      }
      if (form.field_template_id) {
        const r = await fnApplyField({ data: { visitId: data.id, templateId: form.field_template_id } });
        if (!r.ok) toast.error("Falha ao aplicar modelo de reuniões de campo: " + r.error);
      }
      if (form.meeting_talk_template_id) {
        const r = await fnApplyMeetingTalk({ data: { visitId: data.id, templateId: form.meeting_talk_template_id } });
        if (!r.ok) toast.error("Falha ao aplicar modelo de reunião e discurso: " + r.error);
      }
      toast.success("Visita criada");
      setOpen(false);
    } catch (err) {
      console.warn("[visit:insert] erro", err);
      toast.warning("Ligação instável. Tente novamente quando a rede voltar — nenhum dado foi perdido.");
    }
    } finally {
      setSubmitting(false);
    }
  };

  const removeById = async (id: string) => {
    try {
      const res = await offlineDelete("visits", { id });
      if (res.error) { toast.error(res.error.message); return; }
      if (res.queued) toast.success("Exclusão guardada offline — sincronizará quando voltar a ficar online.");
      else toast.success("Visita excluída");
      if (editId === id) setOpen(false);
    } catch (err) {
      console.warn("[visit:delete] erro", err);
      toast.warning("Ligação instável. Os seus dados continuam guardados em segurança no dispositivo.");
    }
  };

  const copyCode = () => {
    if (!congregation) return;
    navigator.clipboard.writeText(congregation.invite_code);
    toast.success("Código copiado");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">{t("itinerary.title")}</h1>

      <Card>
        <CardContent className="p-5">
          {isSuper ? (
            <>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {t("itinerary.circuit")}
              </div>
              <div className="text-lg font-semibold mt-1">
                {profile?.circuit?.trim() ? profile.circuit : t("itinerary.notSet")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("itinerary.circuitHint")}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {t("itinerary.yourCongregation")}
              </div>
              <div className="text-lg font-semibold mt-1">{congregation?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("itinerary.youAreElder")}</div>
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
                  {t("itinerary.inviteCode")}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-2xl font-bold font-mono tracking-widest text-primary">
                    {congregation.invite_code}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyCode}>
                    {t("common.copy")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("itinerary.inviteHint")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" /> {t("itinerary.visits")}
        </h2>
        {isSuper && (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              {t("itinerary.newVisit")}
            </Button>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editId ? t("itinerary.editVisit") : t("itinerary.newVisit")}
                  <SavingIndicator saving={submitting} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("itinerary.congregation")}</Label>
                  <Select
                    value={form.congregation_id}
                    onValueChange={(v) => setForm({ ...form, congregation_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("itinerary.selectPlaceholder")}/>
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
                        inputMode="numeric"
                        className="mt-1"
                        value={form.substitute_phone}
                        onChange={(e) => setForm({ ...form, substitute_phone: maskPhone(e.target.value) })}
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
                      onChange={(e) => {
                        const start = e.target.value;
                        // Mission 1: auto-snap end_date to Sunday (start + 5 days)
                        let end = "";
                        if (start) {
                          const d = new Date(start + "T00:00:00");
                          d.setDate(d.getDate() + 5);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, "0");
                          const dd = String(d.getDate()).padStart(2, "0");
                          end = `${y}-${m}-${dd}`;
                        }
                        setForm((f) => ({ ...f, start_date: start, end_date: end || f.end_date }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Fim (domingo)</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      min={form.start_date || undefined}
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
                {editId ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <Button className="w-full" onClick={submit} disabled={submitting}>
                      {submitting ? "Atualizando..." : "Atualizar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Trash2 className="h-4 w-4 mr-1" /> Excluir esta visita
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir visita?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação removerá a visita e todos os dados relacionados
                            (refeições, transportes, escalas, reuniões). Não é possível desfazer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => editId && removeById(editId)}
                          >
                            Sim, excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={submit} disabled={submitting}>
                    {submitting ? "Agendando visita..." : "Criar"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {visits.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Nenhuma visita cadastrada.
            </CardContent>
          </Card>
        )}
        {(() => {
          // Group visits by month (start_date), preserving the already-ASC order
          const groups: { key: string; label: string; items: Visit[] }[] = [];
          const byKey = new Map<string, { key: string; label: string; items: Visit[] }>();
          for (const v of visits) {
            const d = parseISO(v.start_date);
            const key = format(d, "yyyy-MM");
            let g = byKey.get(key);
            if (!g) {
              const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
              g = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
              byKey.set(key, g);
              groups.push(g);
            }
            g.items.push(v);
          }
          return groups.map((g) => (
            <section key={g.key} className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {g.label}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/40 via-border to-transparent" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {g.items.length} {g.items.length === 1 ? "visita" : "visitas"}
                </span>
              </div>
              <div className="space-y-2">
                {g.items.map((v) => {
                  const cong = congs.find((c) => c.id === v.congregation_id);
                  return (
                    <Card key={v.id} className="shadow-card">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            <div className="text-lg md:text-xl font-bold truncate">
                              {cong?.name ?? "—"}
                            </div>
                          </div>
                          <div className="text-base font-semibold text-foreground mt-1">
                            {format(parseISO(v.start_date), "d MMM", { locale: ptBR })} –{" "}
                            {format(parseISO(v.end_date), "d MMM yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mt-1 truncate">
                            {v.title}
                          </div>
                          {v.title === "Visita SCS" && (v.substitute_name || v.substitute_phone) && (
                            <div
                              className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
                              aria-readonly="true"
                            >
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                <UserCheck className="h-3 w-3" />
                                Substituto do Superintendente
                              </div>
                              {v.substitute_name && (
                                <div className="mt-1 text-sm font-semibold text-foreground break-words">
                                  {v.substitute_name}
                                </div>
                              )}
                              {v.substitute_phone && (
                                isSuper ? (
                                  <a
                                    href={`tel:${v.substitute_phone}`}
                                    className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {v.substitute_phone}
                                  </a>
                                ) : (
                                  <div className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-foreground/80">
                                    <Phone className="h-3 w-3" />
                                    <span aria-readonly="true">{v.substitute_phone}</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        {isSuper && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir visita?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação removerá a visita e todos os dados relacionados. Não é possível desfazer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeById(v.id)}
                                  >
                                    Sim, excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ));
        })()}
      </div>

    </div>
  );
}
