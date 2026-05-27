import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Pencil, Save, AlertCircle, Layers } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120);

export const Route = createFileRoute("/_app/modelo-reunioes-discursos")({ component: Page });

interface TemplateRow { id: string; name: string; congregation_id: string | null }

type Payload = {
  midweek: { service_talk_theme: string; chairman: string; closing_prayer: string; final_song: string; observations: string };
  weekend_public_talk_theme: string;
  weekend_opening_song: string;
  weekend_closing_song: string;
  weekend_observations: string;
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
    observations: string;
  };
  elders: { theme: string; opening_prayer: string; closing_prayer: string; observations: string };
};

const emptyPayload = (): Payload => ({
  midweek: { service_talk_theme: "", chairman: "", closing_prayer: "", final_song: "", observations: "" },
  weekend_public_talk_theme: "",
  weekend_opening_song: "",
  weekend_closing_song: "",
  weekend_observations: "",
  weekend_themes: [],
  pioneer: { weekday: null, meeting_time: "", super_meeting_weekday: null, super_meeting_time: "", location: "", theme: "", opening_prayer: "", closing_prayer: "", observations: "" },
  elders: { theme: "", opening_prayer: "", closing_prayer: "", observations: "" },
});

const MAX = 24;

function Page() {
  const { t } = useTranslation();
  const weekdayLabel = (k: number) => t(`templates.weekdays.${k}`);
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
        final_song: r.midweek?.final_song ?? "",
        observations: r.midweek?.observations ?? "",
      },
      weekend_public_talk_theme: r.weekend_public_talk_theme ?? "",
      weekend_opening_song: r.weekend_opening_song ?? "",
      weekend_closing_song: r.weekend_closing_song ?? "",
      weekend_observations: r.weekend_observations ?? "",
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
        observations: r.pioneer?.observations ?? "",
      },
      elders: {
        theme: r.elders?.theme ?? "",
        opening_prayer: r.elders?.opening_prayer ?? "",
        closing_prayer: r.elders?.closing_prayer ?? "",
        observations: r.elders?.observations ?? "",
      },
    });
  }, [fnGet]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (activeId) loadActive(activeId); else setPayload(emptyPayload()); }, [activeId, loadActive]);

  if (!role) {
    return <Card><CardContent className="p-6 text-sm">{t("templates.meetingTalk.restricted")}</CardContent></Card>;
  }

  const isSuper = role === "superintendent";

  const active = tpls.find((tp) => tp.id === activeId) ?? null;

  const handleCreate = async () => {
    const parsed = nameSchema.safeParse(newName);
    if (!parsed.success) { setNewNameErr(parsed.error.issues[0].message); return; }
    setNewNameErr(null);
    if (tpls.length >= MAX) { toast.error(t("templates.limitReached", { max: MAX })); return; }
    setBusy(true);
    const r = await fnCreate({ data: { name: parsed.data } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("templates.templateCreated"));
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
    toast.success(t("templates.renamed"));
    setRenameOpen(false);
    await loadList();
  };

  const handleDuplicate = async () => {
    if (!active) return;
    setBusy(true);
    const r = await fnDup({ data: { id: active.id, name: `${active.name} ${t("templates.copySuffix")}` } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("templates.templateDuplicated"));
    setActiveId(r.id);
    await loadList();
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!confirm(t("templates.deleteConfirm", { name: active.name }))) return;
    setBusy(true);
    const r = await fnDel({ data: { id: active.id } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("templates.deleted"));
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
            final_song: payload.midweek.final_song || null,
            observations: payload.midweek.observations || null,
          },
          weekend_public_talk_theme: payload.weekend_public_talk_theme.trim() || null,
          weekend_opening_song: payload.weekend_opening_song.trim() || null,
          weekend_closing_song: payload.weekend_closing_song.trim() || null,
          weekend_observations: payload.weekend_observations || null,
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
            observations: payload.pioneer.observations || null,
          },
          elders: {
            theme: payload.elders.theme || null,
            opening_prayer: payload.elders.opening_prayer || null,
            closing_prayer: payload.elders.closing_prayer || null,
            observations: payload.elders.observations || null,
          },
        },
      },
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(t("templates.templateSaved"));
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
            <Layers className="h-6 w-6" />{t("templates.meetingTalk.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("templates.meetingTalk.subtitle", { n: tpls.length, max: MAX })}
          </p>
        </div>
        {isSuper && (
          <div className="flex items-center gap-2 flex-wrap">
            <TemplateIOButtons
              filenameBase={active?.name ?? t("templates.exportMeetingTalk")}
              disabled={!active}
              onExport={async () => active ? fnExport({ data: { id: active.id } }) : { ok: false, error: t("templates.selectTemplate") }}
              onImport={async (file) => { const r = await fnImport({ data: { file: file as never } }); if (r.ok) await loadList(); return r; }}
            />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={tpls.length >= MAX}><Plus className="h-4 w-4 mr-1" />{t("templates.newTemplate")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{t("templates.meetingTalk.newDialogTitle")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t("templates.name")}</Label>
                    <Input
                      className={`mt-1 ${newNameErr ? "border-destructive" : ""}`}
                      value={newName}
                      onChange={(e) => { setNewName(e.target.value); if (newNameErr) setNewNameErr(null); }}
                      placeholder={t("templates.meetingTalk.namePlaceholder")}
                      maxLength={120}
                    />
                    {newNameErr && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{newNameErr}</p>}
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={busy}>{t("common.create")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card><CardContent className="p-3 space-y-1">
          {tpls.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">{t("templates.noTemplates")}</div>
          ) : tpls.map((tp) => (
            <button key={tp.id}
              onClick={() => setActiveId(tp.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${activeId === tp.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
              <div className="truncate">{tp.name}</div>
            </button>
          ))}
        </CardContent></Card>

        <div className="space-y-4">
          {!active ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
              {t("templates.selectOrCreate")}
            </CardContent></Card>
          ) : (
            <>
              <Card><CardContent className="p-4 flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold truncate">{active.name}</div>
                {isSuper ? (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setRenameVal(active.name); setRenameOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />{t("common.rename")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={busy || tpls.length >= MAX}>
                      <Copy className="h-3.5 w-3.5 mr-1" />{t("common.duplicate")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={busy}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />{t("common.delete")}
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={busy}>
                      <Save className="h-3.5 w-3.5 mr-1" />{t("templates.meetingTalk.saveTemplate")}
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("templates.viewOnly")}</span>
                )}
              </CardContent></Card>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="sm:hidden">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t("templates.meetingTalk.subTabPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meio">{t("templates.meetingTalk.tabMidweek")}</SelectItem>
                      <SelectItem value="fim">{t("templates.meetingTalk.tabWeekend")}</SelectItem>
                      <SelectItem value="pio">{t("templates.meetingTalk.tabPioneers")}</SelectItem>
                      <SelectItem value="anc">{t("templates.meetingTalk.tabElders")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <TabsList className="hidden sm:grid grid-cols-4 w-full h-auto gap-1 bg-transparent p-1">
                  <TabsTrigger value="meio" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t("templates.meetingTalk.tabMidweek")}</TabsTrigger>
                  <TabsTrigger value="fim" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t("templates.meetingTalk.tabWeekend")}</TabsTrigger>
                  <TabsTrigger value="pio" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t("templates.meetingTalk.tabPioneers")}</TabsTrigger>
                  <TabsTrigger value="anc" className="min-w-0 whitespace-normal rounded-full border border-border/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t("templates.meetingTalk.tabEldersShort")}</TabsTrigger>
                </TabsList>

                <TabsContent value="meio" className="mt-3">
                  <Card><CardContent className="p-4 grid gap-3 max-w-2xl w-full">
                    <div>
                      <Label>{t("templates.meetingTalk.midweek.serviceTalk")}</Label>
                      <Input className="mt-1" value={payload.midweek.service_talk_theme}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, midweek: { ...payload.midweek, service_talk_theme: e.target.value } })} />
                    </div>
                    <div>
                      <Label>{t("templates.meetingTalk.midweek.chairman")}</Label>
                      <Input className="mt-1" value={payload.midweek.chairman}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, midweek: { ...payload.midweek, chairman: e.target.value } })} />
                    </div>
                    <div>
                      <Label>{t("templates.meetingTalk.midweek.closingPrayer")}</Label>
                      <Input className="mt-1" value={payload.midweek.closing_prayer}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, midweek: { ...payload.midweek, closing_prayer: e.target.value } })} />
                    </div>
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="fim" className="mt-3">
                  <Card><CardContent className="p-4 space-y-4">
                    <div>
                      <Label>{t("templates.meetingTalk.weekend.publicTalk")}</Label>
                      <Input
                        className="mt-1"
                        value={payload.weekend_public_talk_theme}
                        readOnly={!isSuper}
                        placeholder={t("templates.meetingTalk.weekend.publicTalkPlaceholder")}
                        onChange={(e) => setPayload({ ...payload, weekend_public_talk_theme: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {isSuper ? t("templates.meetingTalk.weekend.editorHint") : t("templates.meetingTalk.weekend.readOnly")}
                      </p>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{t("templates.meetingTalk.weekend.finalTalk")}</div>
                          <p className="text-xs text-muted-foreground">{t("templates.meetingTalk.weekend.finalTalkHint")}</p>
                        </div>
                        {isSuper && <Button size="sm" variant="outline" onClick={addTheme}><Plus className="h-3.5 w-3.5 mr-1" />{t("templates.meetingTalk.weekend.addTheme")}</Button>}
                      </div>
                      {payload.weekend_themes.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-2">{t("templates.meetingTalk.weekend.noThemes")}</p>
                      ) : (
                        <ul className="space-y-2 mt-2">
                          {payload.weekend_themes.map((th, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Input value={th.title} readOnly={!isSuper} onChange={(e) => updateTheme(i, e.target.value)} placeholder={t("templates.meetingTalk.weekend.themePlaceholder")} />
                              {isSuper && <Button size="icon" variant="ghost" onClick={() => removeTheme(i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent></Card>
                </TabsContent>



                <TabsContent value="pio" className="mt-3">
                  <Card><CardContent className="p-4 grid gap-3 max-w-2xl w-full">
                    <p className="text-xs text-muted-foreground">{t("templates.meetingTalk.pioneer.intro")}</p>
                    <div>
                      <Label>{t("templates.meetingTalk.pioneer.theme")}</Label>
                      <Input className="mt-1" value={payload.pioneer.theme}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, theme: e.target.value } })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("templates.meetingTalk.pioneer.weekday")}</Label>
                        <Select
                          value={payload.pioneer.weekday === null ? "" : String(payload.pioneer.weekday)}
                          disabled={!isSuper}
                          onValueChange={(v) => setPayload({ ...payload, pioneer: { ...payload.pioneer, weekday: v ? Number(v) : null } })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(WEEKDAY_LABELS).map((k) => <SelectItem key={k} value={k}>{weekdayLabel(Number(k))}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("templates.meetingTalk.pioneer.time")}</Label>
                        <Input type="time" className="mt-1" value={payload.pioneer.meeting_time} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, meeting_time: e.target.value } })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("templates.meetingTalk.pioneer.weekdayCO")}</Label>
                        <Select
                          value={payload.pioneer.super_meeting_weekday === null ? "" : String(payload.pioneer.super_meeting_weekday)}
                          disabled={!isSuper}
                          onValueChange={(v) => setPayload({ ...payload, pioneer: { ...payload.pioneer, super_meeting_weekday: v ? Number(v) : null } })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder={t("templates.meetingTalk.pioneer.sameAsMain")} /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(WEEKDAY_LABELS).map((k) => <SelectItem key={k} value={k}>{weekdayLabel(Number(k))}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("templates.meetingTalk.pioneer.timeCO")}</Label>
                        <Input type="time" className="mt-1" value={payload.pioneer.super_meeting_time} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, super_meeting_time: e.target.value } })} />
                      </div>
                    </div>
                    <div>
                      <Label>{t("templates.meetingTalk.pioneer.location")}</Label>
                      <Input className="mt-1" value={payload.pioneer.location} readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, location: e.target.value } })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("templates.meetingTalk.pioneer.openingPrayer")}</Label>
                        <Input className="mt-1" value={payload.pioneer.opening_prayer} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, opening_prayer: e.target.value } })} />
                      </div>
                      <div>
                        <Label>{t("templates.meetingTalk.pioneer.closingPrayer")}</Label>
                        <Input className="mt-1" value={payload.pioneer.closing_prayer} readOnly={!isSuper}
                          onChange={(e) => setPayload({ ...payload, pioneer: { ...payload.pioneer, closing_prayer: e.target.value } })} />
                      </div>
                    </div>
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="anc" className="mt-3">
                  <Card><CardContent className="p-4 grid gap-3 max-w-2xl w-full">
                    <div>
                      <Label>{t("templates.meetingTalk.elders.theme")}</Label>
                      <Input className="mt-1" value={payload.elders.theme}
                        readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, elders: { ...payload.elders, theme: e.target.value } })} />
                    </div>
                    <div>
                      <Label>{t("templates.meetingTalk.elders.openingPrayer")}</Label>
                      <Input className="mt-1" value={payload.elders.opening_prayer} readOnly={!isSuper}
                        onChange={(e) => setPayload({ ...payload, elders: { ...payload.elders, opening_prayer: e.target.value } })} />
                    </div>
                    <div>
                      <Label>{t("templates.meetingTalk.elders.closingPrayer")}</Label>
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
          <DialogHeader><DialogTitle>{t("templates.renameTemplate")}</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} maxLength={120} />
          <DialogFooter>
            <Button onClick={handleRename} disabled={busy}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
