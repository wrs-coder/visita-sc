import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listElderProgramTemplates,
  getElderProgramTemplate,
  createElderProgramTemplate,
  updateElderProgramTemplate,
  duplicateElderProgramTemplate,
  deleteElderProgramTemplate,
  saveElderProgramTemplate,
  SECTIONS,
  type ElderSection,
  type ElderProgramEventDTO,
} from "@/lib/elder-program-templates.functions";
import { listMyCongregations } from "@/lib/congregations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Pencil, Save, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { CharCounterTextarea } from "@/components/ui/char-counter-textarea";

export const Route = createFileRoute("/_app/modelo-programacao-ancioes")({ component: Page });

const MAX = 50;

const SECTION_TITLES: Record<ElderSection, string> = {
  pastoral: "VISITAS DE PASTOREIO",
  encouragement: "ENCORAJAMENTO — INATIVOS, DOENTES, PRIVILÉGIOS ESPECIAIS",
  recommendations: "RECOMENDAÇÕES PARA ANCIÃOS E SERVOS MINISTERIAIS/CANCELAMENTOS",
  local: "ASSUNTOS LOCAIS DEFINIDOS PELO CORPO DE ANCIÃOS",
};

const ENC_CATEGORY_OPTIONS: Array<{ value: NonNullable<ElderProgramEventDTO["category"]>; label: string }> = [
  { value: "inactive", label: "Inativo" },
  { value: "sick", label: "Doente" },
  { value: "special_privileges", label: "Privilégios Especiais" },
];

const REC_PURPOSE_OPTIONS: Array<{ value: NonNullable<ElderProgramEventDTO["purpose"]>; label: string }> = [
  { value: "ministerial_servant", label: "Servo Ministerial" },
  { value: "elder", label: "Ancião" },
  { value: "redesignation", label: "Redesignação" },
  { value: "removal", label: "Remoção" },
  { value: "cca_change", label: "Mudança de CCA" },
];

interface TemplateRow { id: string; name: string; congregation_id: string | null }

type Sections = Record<ElderSection, string>;

const emptySections = (): Sections => ({ pastoral: "", encouragement: "", recommendations: "", local: "" });

function emptyEvent(section: ElderSection): ElderProgramEventDTO {
  return {
    id: `tmp_${Math.random().toString(36).slice(2)}`,
    section,
    sort_order: 0,
    slot_label: null,
    companion: null,
    family_name: null,
    address: null,
    family_members: null,
    spiritual_info: null,
    category: null,
    person_name: null,
    contact: null,
    health_info: null,
    purpose: null,
    full_name: null,
    field_group: null,
    info: null,
    suggested_by: null,
    subject: null,
    sources: null,
  };
}

function Page() {
  const { role } = useAuth();
  const fnList = useServerFn(listElderProgramTemplates);
  const fnGet = useServerFn(getElderProgramTemplate);
  const fnCreate = useServerFn(createElderProgramTemplate);
  const fnUpdate = useServerFn(updateElderProgramTemplate);
  const fnDup = useServerFn(duplicateElderProgramTemplate);
  const fnDel = useServerFn(deleteElderProgramTemplate);
  const fnSave = useServerFn(saveElderProgramTemplate);
  const fnCongs = useServerFn(listMyCongregations);

  const [tpls, setTpls] = useState<TemplateRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sections, setSections] = useState<Sections>(emptySections());
  const [pastoralSlots, setPastoralSlots] = useState<string[]>([]);
  const [events, setEvents] = useState<ElderProgramEventDTO[]>([]);
  const [newSlot, setNewSlot] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const r = await fnList();
    if (r.ok) setTpls(r.templates as TemplateRow[]);
  }, [fnList]);

  const loadActive = useCallback(async (id: string) => {
    const r = await fnGet({ data: { id } });
    if (!r.ok || !r.template) { toast.error(r.error ?? "Erro"); return; }
    setSections(r.sections);
    setPastoralSlots(r.slots.map((s) => s.label));
    setEvents(r.events);
  }, [fnGet]);

  useEffect(() => { loadList(); }, [loadList]);
  
  useEffect(() => {
    if (activeId) loadActive(activeId);
    else { setSections(emptySections()); setPastoralSlots([]); setEvents([]); }
  }, [activeId, loadActive]);

  if (role !== "superintendent") {
    return <Card><CardContent className="p-6 text-sm">Acesso restrito.</CardContent></Card>;
  }

  const active = tpls.find((tp) => tp.id === activeId) ?? null;

  const handleCreate = async () => {
    const name = newName.trim();
    if (name.length < 2) { toast.error("Nome muito curto."); return; }
    setBusy(true);
    const r = await fnCreate({ data: { name } });
    setBusy(false);
    if (!r.ok || !r.id) { toast.error(r.error ?? "Erro"); return; }
    toast.success("Modelo criado");
    setCreateOpen(false); setNewName("");
    setActiveId(r.id);
    await loadList();
  };

  const handleRename = async () => {
    if (!active) return;
    const name = renameVal.trim();
    if (name.length < 2) { toast.error("Nome muito curto."); return; }
    setBusy(true);
    const r = await fnUpdate({ data: { id: active.id, name } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Renomeado");
    setRenameOpen(false);
    await loadList();
  };


  const handleDuplicate = async () => {
    if (!active) return;
    setBusy(true);
    const r = await fnDup({ data: { id: active.id, name: `${active.name} (cópia)` } });
    setBusy(false);
    if (!r.ok || !r.id) { toast.error(r.error ?? "Erro"); return; }
    toast.success("Duplicado");
    setActiveId(r.id);
    await loadList();
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
    await loadList();
  };

  const handleSave = async () => {
    if (!activeId) return;
    setBusy(true);
    const r = await fnSave({
      data: {
        templateId: activeId,
        sections,
        pastoralSlots,
        events: events.map((e, i) => ({ ...e, sort_order: i })),
      },
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modelo salvo");
  };

  const addSlot = () => {
    const v = newSlot.trim();
    if (!v) return;
    setPastoralSlots([...pastoralSlots, v]);
    setNewSlot("");
  };
  const removeSlot = (i: number) => setPastoralSlots(pastoralSlots.filter((_, idx) => idx !== i));

  const addEvent = (section: ElderSection) => setEvents([...events, emptyEvent(section)]);
  const removeEvent = (id: string) => setEvents(events.filter((e) => e.id !== id));
  const updateEvent = (id: string, patch: Partial<ElderProgramEventDTO>) =>
    setEvents(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const eventsOf = (s: ElderSection) => events.filter((e) => e.section === s);

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Modelo Programação Anciãos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tpls.length} / {MAX} modelos
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={tpls.length >= MAX}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo modelo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={120} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={busy}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card><CardContent className="p-3 space-y-1">
          {tpls.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">Nenhum modelo</div>
          ) : tpls.map((tp) => (
            <button key={tp.id} onClick={() => setActiveId(tp.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${activeId === tp.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
              <div className="truncate">{tp.name}</div>
            </button>
          ))}
        </CardContent></Card>

        <div className="space-y-4">
          {!active ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
              Selecione ou crie um modelo
            </CardContent></Card>
          ) : (
            <>
              <Card><CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold truncate">{active.name}</div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button size="sm" variant="outline" onClick={() => { setRenameVal(active.name); setRenameOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Renomear
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={busy || tpls.length >= MAX}>
                    <Copy className="h-3.5 w-3.5 mr-1" />Duplicar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={busy}>
                    <Save className="h-3.5 w-3.5 mr-1" />Salvar
                  </Button>
                </div>
              </CardContent></Card>

              {SECTIONS.map((section) => (
                <Card key={section}>
                  <CardContent className="p-4 space-y-4">
                    <h2 className="font-bold text-sm uppercase tracking-wide text-primary">{SECTION_TITLES[section]}</h2>
                    <div>
                      <Label className="text-xs">Informações adicionais do superintendente</Label>
                      <CharCounterTextarea
                        className="mt-1 min-h-[80px]"
                        value={sections[section]}
                        max={4000}
                        onValueChange={(v) => setSections({ ...sections, [section]: v })}
                      />
                    </div>

                    {section === "pastoral" && (
                      <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                        <Label className="text-xs">Dias e horários unificados (lista suspensa para os anciãos)</Label>
                        <div className="flex gap-2">
                          <Input value={newSlot} onChange={(e) => setNewSlot(e.target.value)}
                            placeholder="ex.: Sábado, 10:00"
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSlot(); } }} />
                          <Button type="button" size="sm" onClick={addSlot}><Plus className="h-4 w-4" /></Button>
                        </div>
                        {pastoralSlots.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum slot definido</p>
                        ) : (
                          <ul className="space-y-1">
                            {pastoralSlots.map((s, i) => (
                              <li key={i} className="flex items-center justify-between gap-2 text-sm bg-background rounded px-2 py-1">
                                <span>{s}</span>
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeSlot(i)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      {eventsOf(section).map((ev) => (
                        <EventEditor
                          key={ev.id}
                          ev={ev}
                          slots={pastoralSlots}
                          onChange={(patch) => updateEvent(ev.id, patch)}
                          onRemove={() => removeEvent(ev.id)}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addEvent(section)}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar evento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Renomear</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} maxLength={120} />
            <Button className="w-full" onClick={handleRename} disabled={busy}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventEditor({
  ev, slots, onChange, onRemove,
}: {
  ev: ElderProgramEventDTO;
  slots: string[];
  onChange: (patch: Partial<ElderProgramEventDTO>) => void;
  onRemove: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {ev.section === "pastoral" && (
          <>
            <FieldRow label="Dia/Horário (slot)">
              <Select value={ev.slot_label ?? "__none__"} onValueChange={(v) => onChange({ slot_label: v === "__none__" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um slot" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {slots.map((s, i) => <SelectItem key={i} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Ancião/S.M acompanhante">
              <Input value={ev.companion ?? ""} onChange={(e) => onChange({ companion: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Família/Irmão(ã)">
              <Input value={ev.family_name ?? ""} onChange={(e) => onChange({ family_name: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Endereço">
              <Input value={ev.address ?? ""} onChange={(e) => onChange({ address: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Membros da Família">
              <Textarea value={ev.family_members ?? ""} onChange={(e) => onChange({ family_members: e.target.value || null })} className="min-h-[60px]" />
            </FieldRow>
            <FieldRow label="Informações Espirituais e Pessoais das ovelhas">
              <Textarea value={ev.spiritual_info ?? ""} onChange={(e) => onChange({ spiritual_info: e.target.value || null })} className="min-h-[100px]" />
            </FieldRow>
          </>
        )}

        {ev.section === "encouragement" && (
          <>
            <FieldRow label="Categoria">
              <Select value={ev.category ?? "__none__"} onValueChange={(v) => onChange({ category: v === "__none__" ? null : v as ElderProgramEventDTO["category"] })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {ENC_CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Nome">
              <Input value={ev.person_name ?? ""} onChange={(e) => onChange({ person_name: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Endereço">
              <Input value={ev.address ?? ""} onChange={(e) => onChange({ address: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Contato">
              <Input value={ev.contact ?? ""} onChange={(e) => onChange({ contact: e.target.value || null })} />
            </FieldRow>
            {ev.category === "sick" && (
              <FieldRow label="Problemas de Saúde">
                <Textarea value={ev.health_info ?? ""} onChange={(e) => onChange({ health_info: e.target.value || null })} className="min-h-[80px]" />
              </FieldRow>
            )}
            <FieldRow label="Informações Espirituais e Pessoais das ovelhas">
              <Textarea value={ev.spiritual_info ?? ""} onChange={(e) => onChange({ spiritual_info: e.target.value || null })} className="min-h-[100px]" />
            </FieldRow>
          </>
        )}

        {ev.section === "recommendations" && (
          <>
            <FieldRow label="Recomendação para:">
              <Select value={ev.purpose ?? "__none__"} onValueChange={(v) => onChange({ purpose: v === "__none__" ? null : v as ElderProgramEventDTO["purpose"] })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {REC_PURPOSE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Nome Completo">
              <Input value={ev.full_name ?? ""} onChange={(e) => onChange({ full_name: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Membros da Família">
              <Textarea value={ev.family_members ?? ""} onChange={(e) => onChange({ family_members: e.target.value || null })} className="min-h-[60px]" />
            </FieldRow>
            <FieldRow label="Grupo de campo">
              <Input value={ev.field_group ?? ""} onChange={(e) => onChange({ field_group: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Informações espirituais, pessoais e familiares">
              <Textarea value={ev.info ?? ""} onChange={(e) => onChange({ info: e.target.value || null })} className="min-h-[100px]" />
            </FieldRow>
          </>
        )}

        {ev.section === "local" && (
          <>
            <FieldRow label="Quem indicou">
              <Input value={ev.suggested_by ?? ""} onChange={(e) => onChange({ suggested_by: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Tema do assunto">
              <Input value={ev.subject ?? ""} onChange={(e) => onChange({ subject: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Fontes de matéria já pesquisadas">
              <Textarea value={ev.sources ?? ""} onChange={(e) => onChange({ sources: e.target.value || null })} className="min-h-[60px]" />
            </FieldRow>
            <FieldRow label="Informações sobre o assunto">
              <Textarea value={ev.info ?? ""} onChange={(e) => onChange({ info: e.target.value || null })} className="min-h-[100px]" />
            </FieldRow>
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
