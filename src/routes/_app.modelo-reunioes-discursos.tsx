import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listMeetingTalkTemplates,
  getMeetingTalkTemplate,
  createMeetingTalkTemplate,
  updateMeetingTalkTemplate,
  duplicateMeetingTalkTemplate,
  deleteMeetingTalkTemplate,
  saveMeetingTalkTemplateItems,
  exportMeetingTalkTemplate,
  importMeetingTalkTemplate,
  WEEKDAY_LABELS,
} from "@/lib/meeting-talk-templates.functions";
import { TemplateIOButtons } from "@/components/TemplateIOButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Pencil, Save, AlertCircle, Layers } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120);

export const Route = createFileRoute("/_app/modelo-reunioes-discursos")({ component: Page });

interface TemplateRow { id: string; name: string; congregation_id: string | null }

type Payload = {
  midweek: { service_talk_theme: string; chairman: string; closing_prayer: string };
  weekend_public_talk_theme: string;
  weekend_themes: { title: string }[];
  pioneer: {
    weekday: number | null;
    meeting_time: string;
    super_meeting_weekday: number | null;
    super_meeting_time: string;
    location: string;
    theme: string;
    opening_prayer: string;
    closing_prayer: string;
  };
  elders: { theme: string; opening_prayer: string; closing_prayer: string };
};

const emptyPayload = (): Payload => ({
  midweek: { service_talk_theme: "", chairman: "", closing_prayer: "" },
  weekend_public_talk_theme: "",
  weekend_themes: [],
  pioneer: { weekday: null, meeting_time: "", super_meeting_weekday: null, super_meeting_time: "", location: "", theme: "", opening_prayer: "", closing_prayer: "" },
  elders: { theme: "", opening_prayer: "", closing_prayer: "" },
});

const MAX = 24;

function Page() {
  const { role } = useAuth();
  const fnList = useServerFn(listMeetingTalkTemplates);
  const fnGet = useServerFn(getMeetingTalkTemplate);
  const fnCreate = useServerFn(createMeetingTalkTemplate);
  const fnUpdate = useServerFn(updateMeetingTalkTemplate);
  const fnDup = useServerFn(duplicateMeetingTalkTemplate);
  const fnDel = useServerFn(deleteMeetingTalkTemplate);
  const fnSave = useServerFn(saveMeetingTalkTemplateItems);
  const fnExport = useServerFn(exportMeetingTalkTemplate);
  const fnImport = useServerFn(importMeetingTalkTemplate);

  const [tpls, setTpls] = useState<TemplateRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload>(emptyPayload());
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameErr, setNewNameErr] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("meio");

  const loadList = useCallback(async () => {
    const r = await fnList();
    if (r.ok) setTpls(r.templates as TemplateRow[]);
  }, [fnList]);

  const loadActive = useCallback(async (id: string) => {
    const r = await fnGet({ data: { id } });
    if (!r.ok) { toast.error(r.error); return; }
    setPayload({
      midweek: {
        service_talk_theme: r.midweek?.service_talk_theme ?? "",
        chairman: r.midweek?.chairman ?? "",
        closing_prayer: r.midweek?.closing_prayer ?? "",
      },
      weekend_public_talk_theme: r.weekend_public_talk_theme ?? "",
      weekend_themes: (r.weekend_themes ?? []).map((t) => ({ title: t.title })),
      pioneer: {
        weekday: r.pioneer?.weekday ?? null,
        meeting_time: r.pioneer?.meeting_time ?? "",
        super_meeting_weekday: r.pioneer?.super_meeting_weekday ?? null,
        super_meeting_time: r.pioneer?.super_meeting_time ?? "",
        location: r.pioneer?.location ?? "",
        theme: r.pioneer?.theme ?? "",
        opening_prayer: r.pioneer?.opening_prayer ?? "",
        closing_prayer: r.pioneer?.closing_prayer ?? "",
      },
      elders: {
        theme: r.elders?.theme ?? "",
        opening_prayer: r.elders?.opening_prayer ?? "",
        closing_prayer: r.elders?.closing_prayer ?? "",
      },
    });
  }, [fnGet]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (activeId) loadActive(activeId); else setPayload(emptyPayload()); }, [activeId, loadActive]);

  if (!role) {
    return <Card><CardContent className="p-6 text-sm">Acesso restrito.</CardContent></Card>;
  }

  const isSuper = role === "superintendent";

  const active = tpls.find((t) => t.id === activeId) ?? null;

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
    await loadList();
  };

  const handleRename = async () => {
    if (!active) return;
    const parsed = nameSchema.safeParse(renameVal);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const r = await fnUpdate({ data: { id: active.id, name: parsed.data } });
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
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modelo duplicado");
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
        payload: {
          midweek: {
              service_talk_theme: payload.midweek.service_talk_theme || null,
            chairman: payload.midweek.chairman || null,
            closing_prayer: payload.midweek.closing_prayer || null,
          },
          weekend_public_talk_theme: payload.weekend_public_talk_theme.trim() || null,
          weekend_themes: payload.weekend_themes.filter((t) => t.title.trim()).map((t) => ({ title: t.title.trim() })),
          pioneer: {
            weekday: payload.pioneer.weekday,
            meeting_time: payload.pioneer.meeting_time || null,
            super_meeting_weekday: payload.pioneer.super_meeting_weekday,
            super_meeting_time: payload.pioneer.super_meeting_time || null,
            location: payload.pioneer.location || null,
              theme: payload.pioneer.theme || null,
            opening_prayer: payload.pioneer.opening_prayer || null,
            closing_prayer: payload.pioneer.closing_prayer || null,
          },
          elders: {
              theme: payload.elders.theme || null,
            opening_prayer: payload.elders.opening_prayer || null,
            closing_prayer: payload.elders.closing_prayer || null,
          },
        },
      },
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Modelo salvo");
  };

  const addTheme = () => setPayload({ ...payload, weekend_themes: [...payload.weekend_themes, { title: "" }] });
  const removeTheme = (i: number) => setPayload({ ...payload, weekend_themes: payload.weekend_themes.filter((_, idx) => idx !== i) });
  const updateTheme = (i: number, title: string) => setPayload({
    ...payload,
    weekend_themes: payload.weekend_themes.map((t, idx) => (idx === i ? { title } : t)),
  });

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />Modelos de Reunião e Discurso
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie modelos reutilizáveis com Meio de Semana, Fim de Semana (vários temas), Pioneiros e Anciãos/Servos. {tpls.length}/{MAX} modelos.
          </p>
        </div>
        {isSuper && (
          <div className="flex items-center gap-2 flex-wrap">
            <TemplateIOButtons
              filenameBase={active?.name ?? "modelo-reuniao-discurso"}
              disabled={!active}
              onExport={async () => active ? fnExport({ data: { id: active.id } }) : { ok: false, error: "Selecione um modelo" }}
              onImport={async (file) => { const r = await fnImport({ data: { file: file as never } }); if (r.ok) await loadList(); return r; }}
            />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={tpls.length >= MAX}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Novo modelo</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      className={`mt-1 ${newNameErr ? "border-destructive" : ""}`}
                      value={newName}
                      onChange={(e) => { setNewName(e.target.value); if (newNameErr) setNewNameErr(null); }}
                      placeholder="Ex: Modelo padrão"
                      maxLength={120}
                    />
                    {newNameErr && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{newNameErr}</p>}
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={busy}>Criar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card><CardContent className="p-3 space-y-1">
          {tpls.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">Nenhum modelo ainda.</div>
          ) : tpls.map((t) => (
            <button key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${activeId === t.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
              <div className="truncate">{t.name}</div>
            </button>
          ))}
        </CardContent></Card>

        <div className="space-y-4">
          {!active ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
              Selecione um modelo ou crie um novo.
            </CardContent></Card>
          ) : (
            <>
              <Card><CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold truncate">{active.name}</div>
                {isSuper ? (
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
                    <Button size="sm" onClick={handleSave} disabled={busy}>
                      <Save className="h-3.5 w-3.5 mr-1" />Salvar modelo
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Somente visualização</span>
                )}
              </CardContent></Card>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="sm:hidden">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Escolha a sub-aba" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meio">Meio de Semana</SelectItem>
                      <SelectItem value="fim">Fim de Semana</SelectItem>
                      <SelectItem value="pio">Pioneiros</SelectItem>
                      <SelectItem value="anc">Anciãos e Servos Ministeriais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <TabsList className="hidden sm:grid grid-cols-4 w-full h-auto gap-1 bg-transparent p-1">
                  <TabsTrigger value="meio" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Meio de Semana</TabsTrigger>
                  <TabsTrigger value="fim" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fim de Semana</TabsTrigger>
                  <TabsTrigger value="pio" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Pioneiros</TabsTrigger>
                  <TabsTrigger value="anc" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Anciãos e Servos</TabsTrigger>
                </TabsList>

                <TabsContent value="meio" className="mt-3">
                  <Card><CardContent className="p-4 grid gap-3 max-w-2xl w-full">
                    <div>
                      <Label>Tema: Discurso de serviço</Label>
                      <Input className="mt-1" value={payload.midweek.service_talk_theme}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, midweek: { ...payload.midweek, service_talk_theme: e.target.value } })} />
                    </div>
                    <div>
                      <Label>Presidente da Reunião</Label>
                      <Input className="mt-1" value={payload.midweek.chairman}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, midweek: { ...payload.midweek, chairman: e.target.value } })} />
                    </div>
                    <div>
                      <Label>Oração Final</Label>
                      <Input className="mt-1" value={payload.midweek.closing_prayer}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, midweek: { ...payload.midweek, closing_prayer: e.target.value } })} />
                    </div>
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="fim" className="mt-3">
                  <Card><CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">Tema: Discurso Público</div>
                        <p className="text-xs text-muted-foreground">Cadastre vários temas. Os anciãos escolherão um deles num dropdown.</p>
                      </div>
                      {isSuper && <Button size="sm" variant="outline" onClick={addTheme}><Plus className="h-3.5 w-3.5 mr-1" />Tema</Button>}
                    </div>
                    {payload.weekend_themes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum tema. Adicione pelo menos um.</p>
                    ) : (
                      <ul className="space-y-2">
                        {payload.weekend_themes.map((t, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Input value={t.title} readOnly={!isSuper} onChange={(e) => updateTheme(i, e.target.value)} placeholder="Ex.: O Reino vai resolver..." />
                            {isSuper && <Button size="icon" variant="ghost" onClick={() => removeTheme(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="pio" className="mt-3">
                  <Card><CardContent className="p-4 grid gap-3 max-w-2xl w-full">
                    <p className="text-xs text-muted-foreground">Apenas dia da semana + horário; sem calendário de datas específicas.</p>
                    <div>
                      <Label>Tema:</Label>
                      <Input className="mt-1" value={payload.pioneer.theme}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, theme: e.target.value } })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Dia da semana</Label>
                        <Select
                          value={payload.pioneer.weekday === null ? "" : String(payload.pioneer.weekday)}
                          disabled={!isSuper}
                          onValueChange={(v) => setPayload({ ...payload, pioneer: { ...payload.pioneer, weekday: v ? Number(v) : null } })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione…" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(WEEKDAY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Horário</Label>
                        <Input type="time" className="mt-1" value={payload.pioneer.meeting_time} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, meeting_time: e.target.value } })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Dia da reunião com SC (opcional)</Label>
                        <Select
                          value={payload.pioneer.super_meeting_weekday === null ? "" : String(payload.pioneer.super_meeting_weekday)}
                          disabled={!isSuper}
                          onValueChange={(v) => setPayload({ ...payload, pioneer: { ...payload.pioneer, super_meeting_weekday: v ? Number(v) : null } })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Mesmo do principal" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(WEEKDAY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Horário SC (opcional)</Label>
                        <Input type="time" className="mt-1" value={payload.pioneer.super_meeting_time} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, super_meeting_time: e.target.value } })} />
                      </div>
                    </div>
                    <div>
                      <Label>Local</Label>
                      <Input className="mt-1" value={payload.pioneer.location} readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, location: e.target.value } })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Oração Inicial</Label>
                        <Input className="mt-1" value={payload.pioneer.opening_prayer} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, opening_prayer: e.target.value } })} />
                      </div>
                      <div>
                        <Label>Oração Final</Label>
                        <Input className="mt-1" value={payload.pioneer.closing_prayer} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, closing_prayer: e.target.value } })} />
                      </div>
                    </div>
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="anc" className="mt-3">
                  <Card><CardContent className="p-4 grid gap-3 max-w-2xl w-full">
                    <div>
                      <Label>Tema:</Label>
                      <Input className="mt-1" value={payload.elders.theme}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, elders: { ...payload.elders, theme: e.target.value } })} />
                    </div>
                    <div>
                      <Label>Oração Inicial</Label>
                      <Input className="mt-1" value={payload.elders.opening_prayer} readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, elders: { ...payload.elders, opening_prayer: e.target.value } })} />
                    </div>
                    <div>
                      <Label>Oração Final</Label>
                      <Input className="mt-1" value={payload.elders.closing_prayer} readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, elders: { ...payload.elders, closing_prayer: e.target.value } })} />
                    </div>
                  </CardContent></Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Renomear modelo</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} maxLength={120} />
          <DialogFooter>
            <Button onClick={handleRename} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
