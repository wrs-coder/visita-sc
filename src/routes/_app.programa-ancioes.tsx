import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useActiveVisit } from "@/hooks/use-active-visit";
import {
  listElderProgramForVisit,
  updateElderProgramEvent,
  createElderRecommendation,
  deleteElderProgramEvent,
  type ElderVisitEventDTO,
} from "@/lib/elder-program.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Trash2, Loader2, FileDown, CalendarPlus, StickyNote } from "lucide-react";
import { ElderExecutiveReportDialog } from "@/components/elder-program/ElderExecutiveReportDialog";
import { TemplateExtraBlock } from "@/components/meetings/TemplateExtraBlock";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ElderTabPasswordCard } from "@/components/elder-program/ElderTabPasswordCard";
import { SupervisorEditToggle } from "@/components/SupervisorEditToggle";

export const Route = createFileRoute("/_app/programa-ancioes")({ component: Page });

type Section = "pastoral" | "encouragement" | "recommendations" | "local";

const SECTION_TITLES: Record<Section, string> = {
  pastoral: "VISITAS DE PASTOREIO",
  encouragement: "ENCORAJAMENTO — INATIVOS, DOENTES, PRIVILÉGIOS ESPECIAIS",
  recommendations: "RECOMENDAÇÕES PARA ANCIÃOS E SERVOS MINISTERIAIS/CANCELAMENTOS",
  local: "ASSUNTOS LOCAIS DEFINIDOS PELO CORPO DE ANCIÃOS",
};

const SECTIONS: Section[] = ["pastoral", "encouragement", "recommendations", "local"];

const ENC_CATEGORY_OPTIONS: Array<{ value: NonNullable<ElderVisitEventDTO["category"]>; label: string }> = [
  { value: "inactive", label: "Inativo" },
  { value: "sick", label: "Doente" },
  { value: "special_privileges", label: "Privilégios Especiais" },
];

const REC_PURPOSE_OPTIONS: Array<{ value: NonNullable<ElderVisitEventDTO["purpose"]>; label: string }> = [
  { value: "ministerial_servant", label: "Servo Ministerial" },
  { value: "elder", label: "Ancião" },
  { value: "redesignation", label: "Redesignação" },
  { value: "removal", label: "Remoção" },
  { value: "cca_change", label: "Mudança de CCA" },
];

function Page() {
  const { t } = useTranslation();
  const { canEdit: canEditAuth, role } = useAuth();
  const isSuper = role === "superintendent";
  const [editEnabled, setEditEnabled] = useState(false);
  const canEdit = isSuper ? editEnabled : canEditAuth;
  const { visit, loading: visitLoading } = useActiveVisit();
  const fnLoad = useServerFn(listElderProgramForVisit);
  const fnUpdate = useServerFn(updateElderProgramEvent);
  const fnCreateRec = useServerFn(createElderRecommendation);
  const fnDelete = useServerFn(deleteElderProgramEvent);
  const navigate = useNavigate();

  const PURPOSE_TO_TIPO: Record<string, string> = {
    ministerial_servant: "Servo ministerial",
    elder: "Ancião",
    cca_change: "CCA",
    // redesignation e removal: tipo vazio (escolha manual)
  };

  const goToCronograma = (ev: ElderVisitEventDTO) => {
    if (!visit) return;
    const titleParts = ["Visita de Pastoreio"];
    if (ev.family_name) titleParts.push(ev.family_name);
    const noteLines: string[] = [];
    if (ev.slot_label) noteLines.push(`Slot: ${ev.slot_label}`);
    if (ev.family_members) noteLines.push(`Família: ${ev.family_members}`);
    if (ev.spiritual_info) noteLines.push(`Info: ${ev.spiritual_info}`);
    navigate({
      to: "/cronograma",
      search: {
        action: "new",
        title: titleParts.join(" — "),
        location: ev.address ?? undefined,
        companion: ev.companion ?? undefined,
        notes: noteLines.join("\n") || undefined,
        congId: visit.congregation_id,
      } as never,
    });
  };

  const goToNotas = (ev: ElderVisitEventDTO) => {
    if (!visit) return;
    const corpoLines: string[] = [];
    if (ev.family_members) corpoLines.push(`Membros da Família: ${ev.family_members}`);
    if (ev.field_group) corpoLines.push(`Grupo de campo: ${ev.field_group}`);
    if (ev.info) corpoLines.push(`Informações: ${ev.info}`);
    navigate({
      to: "/notas",
      search: {
        tab: "recomendados",
        newNote: "recomendados",
        congId: visit.congregation_id,
        nome: ev.full_name ?? undefined,
        tipo: ev.purpose ? PURPOSE_TO_TIPO[ev.purpose] ?? undefined : undefined,
        corpo: corpoLines.join("\n") || undefined,
      } as never,
    });
  };


  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Record<Section, string>>({
    pastoral: "", encouragement: "", recommendations: "", local: "",
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [pastoral, setPastoral] = useState<ElderVisitEventDTO[]>([]);
  const [encouragement, setEncouragement] = useState<ElderVisitEventDTO[]>([]);
  const [recommendations, setRecommendations] = useState<ElderVisitEventDTO[]>([]);
  const [local, setLocal] = useState<ElderVisitEventDTO[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!visit) return;
    setLoading(true);
    const r = await fnLoad({ data: { visitId: visit.id } });
    setLoading(false);
    if (!r.ok) { toast.error(r.error ?? "Erro"); return; }
    setSections(r.sections);
    setSlots(r.slots.map((s) => s.label));
    setPastoral(r.pastoral);
    setEncouragement(r.encouragement);
    setRecommendations(r.recommendations);
    setLocal(r.local);
  }, [visit, fnLoad]);

  useEffect(() => { reload(); }, [reload]);

  if (visitLoading) return <LoadingPanel />;
  if (!visit) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma visita ativa.</CardContent></Card>;
  }

  const listFor = (s: Section) => (
    s === "pastoral" ? pastoral :
    s === "encouragement" ? encouragement :
    s === "recommendations" ? recommendations : local
  );
  const setListFor = (s: Section, v: ElderVisitEventDTO[]) => {
    if (s === "pastoral") setPastoral(v);
    else if (s === "encouragement") setEncouragement(v);
    else if (s === "recommendations") setRecommendations(v);
    else setLocal(v);
  };

  const saveField = async (ev: ElderVisitEventDTO, patch: Partial<ElderVisitEventDTO>) => {
    // Update local imediato; persiste no servidor.
    const list = listFor(ev.section);
    setListFor(ev.section, list.map((x) => (x.id === ev.id ? { ...x, ...patch } : x)));
    const allowed = [
      "sort_order", "slot_label", "companion", "family_name", "address",
      "family_members", "spiritual_info", "category", "person_name", "contact",
      "health_info", "purpose", "full_name", "field_group", "info",
      "suggested_by", "subject", "sources",
    ] as const;
    const cleanPatch: Record<string, unknown> = {};
    for (const k of allowed) if (k in patch) cleanPatch[k] = (patch as Record<string, unknown>)[k];
    const r = await fnUpdate({ data: { id: ev.id, visitId: visit.id, section: ev.section, patch: cleanPatch } });
    if (!r.ok) toast.error(r.error);
  };

  const addRecommendation = async () => {
    const r = await fnCreateRec({ data: { visitId: visit.id } });
    if (!r.ok || !r.row) { toast.error(r.error ?? "Erro"); return; }
    setRecommendations([...recommendations, r.row]);
  };

  const deleteEvent = async (ev: ElderVisitEventDTO) => {
    if (!confirm("Excluir este card?")) return;
    const r = await fnDelete({ data: { id: ev.id, visitId: visit.id, section: ev.section } });
    if (!r.ok) { toast.error(r.error); return; }
    setListFor(ev.section, listFor(ev.section).filter((x) => x.id !== ev.id));
  };

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Pastoreios, Recomendações e outros
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuper ? t("elderProgram.subtitleSuper") : t("elderProgram.subtitleElder")}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Semana da Visita — {visit.title}
        </p>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
            <FileDown className="h-4 w-4 mr-1" /> Relatório executivo
          </Button>
        </div>
      </div>

      {isSuper && <SupervisorEditToggle enabled={editEnabled} onChange={setEditEnabled} />}

      {loading ? <LoadingPanel /> : (
        <>
          {!isSuper && (
            <ElderTabPasswordCard congregationId={visit.congregation_id} />
          )}
          {SECTIONS.map((section) => {
            const events = listFor(section);
            const canAddManual = section === "recommendations" && canEdit;
            return (
              <Card key={section}>
                <CardContent className="p-4 space-y-4">
                  <h2 className="font-bold text-sm uppercase tracking-wide text-primary">{SECTION_TITLES[section]}</h2>

                  <TemplateExtraBlock label="Informações adicionais do superintendente" value={sections[section]} />

                  {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {section === "recommendations" && canAddManual
                        ? "Nenhum evento. Adicione abaixo."
                        : "Nenhum evento criado pelo superintendente."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((ev) => {
                        const usedSlots = section === "pastoral"
                          ? new Set(
                              pastoral
                                .filter((p) => p.id !== ev.id && p.slot_label)
                                .map((p) => p.slot_label as string),
                            )
                          : new Set<string>();
                        return (
                          <EventCard
                            key={ev.id}
                            ev={ev}
                            slots={slots}
                            usedSlots={usedSlots}
                            readOnly={!canEdit}
                            canDelete={canEdit && (ev.section === "recommendations" || isSuper)}
                            onChange={(patch) => saveField(ev, patch)}
                            onDelete={() => deleteEvent(ev)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {canAddManual && (
                    <Button type="button" variant="outline" size="sm" onClick={addRecommendation}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
      <ElderExecutiveReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        visitTitle={visit.title}
        sections={sections}
        pastoral={pastoral}
        encouragement={encouragement}
        recommendations={recommendations}
        local={local}
      />
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-10 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
    </div>
  );
}

function EventCard({
  ev, slots, usedSlots, readOnly, canDelete, onChange, onDelete,
}: {
  ev: ElderVisitEventDTO;
  slots: string[];
  usedSlots: Set<string>;
  readOnly: boolean;
  canDelete: boolean;
  onChange: (patch: Partial<ElderVisitEventDTO>) => void;
  onDelete: () => void;
}) {
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [hideUsed, setHideUsed] = useState(false);
  const slotConflict = ev.section === "pastoral" && !!ev.slot_label && usedSlots.has(ev.slot_label);
  const visibleSlots = hideUsed ? slots.filter((s) => !usedSlots.has(s) || s === ev.slot_label) : slots;
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {ev.source === "manual" && ev.section === "recommendations" ? (
            <span className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
              Adicionado pelos anciãos
            </span>
          ) : <span />}
          {canDelete && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {ev.section === "pastoral" && (
          <>
            <FieldRow label="Dia/Horário">
              <Select
                value={ev.slot_label ?? "__none__"}
                onValueChange={(v) => {
                  const next = v === "__none__" ? null : v;
                  if (next && next !== ev.slot_label && usedSlots.has(next)) {
                    setPendingSlot(next);
                    return;
                  }
                  setHideUsed(false);
                  onChange({ slot_label: next });
                }}
                disabled={readOnly}
              >
                <SelectTrigger
                  className={cn(slotConflict && "border-destructive text-destructive focus:ring-destructive")}
                >
                  <SelectValue placeholder={slots.length ? "Selecione um slot" : "Superintendente ainda não definiu slots"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {visibleSlots.map((s, i) => <SelectItem key={i} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {slotConflict && (
                <p className="mt-1 text-[11px] text-destructive">
                  Este horário já está em uso por outro evento.
                </p>
              )}
            </FieldRow>
            <AlertDialog open={pendingSlot !== null} onOpenChange={(o) => { if (!o) setPendingSlot(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conflito de horário</AlertDialogTitle>
                  <AlertDialogDescription>
                    O horário “{pendingSlot}” já está atribuído a outra visita de pastoreio. Deseja confirmar mesmo assim?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => { setHideUsed(true); setPendingSlot(null); }}
                  >
                    Não, escolher outro
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const v = pendingSlot;
                      setPendingSlot(null);
                      setHideUsed(false);
                      if (v) onChange({ slot_label: v });
                    }}
                  >
                    Sim, confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <DebouncedText label="Ancião/S.M acompanhante" value={ev.companion} onSave={(v) => onChange({ companion: v })} readOnly={readOnly} />
            <DebouncedText label="Família/Irmão(ã)" value={ev.family_name} onSave={(v) => onChange({ family_name: v })} readOnly={readOnly} />
            <DebouncedText label="Endereço" value={ev.address} onSave={(v) => onChange({ address: v })} readOnly={readOnly} />
            <DebouncedArea label="Membros da Família" value={ev.family_members} onSave={(v) => onChange({ family_members: v })} readOnly={readOnly} minH={60} />
            <DebouncedArea label="Informações Espirituais e Pessoais das ovelhas" value={ev.spiritual_info} onSave={(v) => onChange({ spiritual_info: v })} readOnly={readOnly} minH={100} />
          </>
        )}

        {ev.section === "encouragement" && (
          <>
            <FieldRow label="Categoria">
              <Select
                value={ev.category ?? "__none__"}
                onValueChange={(v) => onChange({ category: v === "__none__" ? null : v as ElderVisitEventDTO["category"] })}
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {ENC_CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <DebouncedText label="Nome" value={ev.person_name} onSave={(v) => onChange({ person_name: v })} readOnly={readOnly} />
            <DebouncedText label="Endereço" value={ev.address} onSave={(v) => onChange({ address: v })} readOnly={readOnly} />
            <DebouncedText label="Contato" value={ev.contact} onSave={(v) => onChange({ contact: v })} readOnly={readOnly} />
            {ev.category === "sick" && (
              <DebouncedArea label="Problemas de Saúde" value={ev.health_info} onSave={(v) => onChange({ health_info: v })} readOnly={readOnly} minH={80} />
            )}
            <DebouncedArea label="Informações Espirituais e Pessoais das ovelhas" value={ev.spiritual_info} onSave={(v) => onChange({ spiritual_info: v })} readOnly={readOnly} minH={100} />
          </>
        )}

        {ev.section === "recommendations" && (
          <>
            <FieldRow label="Recomendação para:">
              <Select
                value={ev.purpose ?? "__none__"}
                onValueChange={(v) => onChange({ purpose: v === "__none__" ? null : v as ElderVisitEventDTO["purpose"] })}
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {REC_PURPOSE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <DebouncedText label="Nome Completo" value={ev.full_name} onSave={(v) => onChange({ full_name: v })} readOnly={readOnly} />
            <DebouncedArea label="Membros da Família" value={ev.family_members} onSave={(v) => onChange({ family_members: v })} readOnly={readOnly} minH={60} />
            <DebouncedText label="Grupo de campo" value={ev.field_group} onSave={(v) => onChange({ field_group: v })} readOnly={readOnly} />
            <DebouncedArea label="Informações espirituais, pessoais e familiares" value={ev.info} onSave={(v) => onChange({ info: v })} readOnly={readOnly} minH={100} />
          </>
        )}

        {ev.section === "local" && (
          <>
            <DebouncedText label="Quem indicou" value={ev.suggested_by} onSave={(v) => onChange({ suggested_by: v })} readOnly={readOnly} />
            <DebouncedText label="Tema do assunto" value={ev.subject} onSave={(v) => onChange({ subject: v })} readOnly={readOnly} />
            <DebouncedArea label="Fontes de matéria já pesquisadas" value={ev.sources} onSave={(v) => onChange({ sources: v })} readOnly={readOnly} minH={60} />
            <DebouncedArea label="Informações sobre o assunto" value={ev.info} onSave={(v) => onChange({ info: v })} readOnly={readOnly} minH={100} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DebouncedText({
  label, value, onSave, readOnly,
}: { label: string; value: string | null; onSave: (v: string | null) => void; readOnly?: boolean }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <FieldRow label={label}>
      <Input value={local} readOnly={readOnly}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== (value ?? "")) onSave(local || null); }} />
    </FieldRow>
  );
}

function DebouncedArea({
  label, value, onSave, readOnly, minH = 80,
}: { label: string; value: string | null; onSave: (v: string | null) => void; readOnly?: boolean; minH?: number }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <FieldRow label={label}>
      <Textarea value={local} readOnly={readOnly}
        style={{ minHeight: minH }}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== (value ?? "")) onSave(local || null); }} />
    </FieldRow>
  );
}
