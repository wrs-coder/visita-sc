import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { readGuestSession, clearGuestSession } from "@/lib/guest-session";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { LogOut, CalendarDays, UtensilsCrossed, Users, Car, MapPin, Clock, Phone, ListChecks, Compass, Share2, Image as ImageIcon, FileDown, MessageCircle, Sun, Mic, CloudDownload } from "lucide-react";
import { Logo } from "@/components/Logo";
import { format, parseISO } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { saveBlob } from "@/lib/share";
import { saveSnapshot, loadSnapshot } from "@/lib/snapshot-cache";
import { GuestOfflineDialog } from "@/components/GuestOfflineDialog";
import { TemplateExtraBlock } from "@/components/meetings/TemplateExtraBlock";

export const Route = createFileRoute("/visitante/painel")({ component: Page });

interface Snapshot {
  wifeMode: boolean;
  congregation: { id: string; name: string };
  visit: { id: string; title: string; start_date: string; end_date: string } | null;
  schedule: Array<{ id: string; event_date: string; start_time: string | null; end_time: string | null; title: string; location: string | null; type: string; notes: string | null }>;
  meals: Array<{ id: string; meal_date: string; type: string; host_name: string | null; location: string | null; meal_time: string | null; contact_phone: string | null; notes: string | null }>;
  mealDayNotes: Array<{ meal_date: string; notes: string }>;
  field: Array<{ id: string; event_date: string; period: string; meeting_point: string | null; meeting_time: string | null; acompanhante: string | null; acompanhante_for: string | null; contact_phone: string | null }>;
  fieldMeetings: Array<{ id: string; event_date: string; period: string; modality: string; meeting_time: string | null; territory_number: string | null; territory_location: string | null; auxiliary_leaders: string | null; closing_prayer: string | null }>;
  transport: Array<{ id: string; event_date: string | null; driver_name: string; contact_phone: string | null; description: string | null; notes: string | null }>;
  checklist: Array<{ id: string; title: string; description: string | null; status: string; link_or_notes: string | null; info_text: string | null }>;
  midweek: Array<{ id: string; chairman: string | null; service_talk_theme: string | null; closing_prayer: string | null }>;
  weekend: Array<{ id: string; meeting_at: string | null; public_talk_theme: string | null; talk_theme_title: string | null }>;
  pioneer: Array<{ id: string; meeting_at: string | null; super_meeting_at: string | null; location: string | null; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }>;
  elders: Array<{ id: string; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }>;
  templateExtras?: {
    field: { observations: string | null } | null;
    midweek: { observations: string | null } | null;
    weekend: { opening_song: string | null; closing_song: string | null; observations: string | null } | null;
    pioneer: { observations: string | null } | null;
    elders: { observations: string | null } | null;
    program: { general_observations: string | null } | null;
  };
}

type SectionKey = "cron" | "estudos" | "campo" | "ref" | "trans" | "check";

function fmtTime(t: string | null) { return t ? t.slice(0, 5) : "—"; }

function Page() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const nav = useNavigate();
  const fn = useServerFn(getGuestSnapshot);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);

  const fmtDate = useCallback((d: string) => format(parseISO(d), "EEE, d MMM", { locale: dateLocale }), [dateLocale]);
  const mealLabel = useCallback((type: string) => type === "lunch" ? t("guest.meal.lunch") : type === "dinner" ? t("guest.meal.dinner") : t("guest.meal.breakfast"), [t]);

  const SECTION_LABELS: Record<SectionKey, string> = useMemo(() => ({
    cron: t("guest.sections.cron"),
    estudos: t("guest.sections.estudos"),
    campo: t("guest.sections.campo"),
    ref: t("guest.sections.ref"),
    trans: t("guest.sections.trans"),
    check: t("guest.sections.check"),
  }), [t]);

  const load = useCallback(async (c: string) => {
    // Hidrata imediatamente do cache local para funcionar offline.
    const cached = loadSnapshot<Snapshot>("guest", c);
    if (cached) {
      setSnap(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const r = await fn({ data: { inviteCode: c } });
      if (!(r as { ok: boolean }).ok) {
        // Resposta explícita do servidor: sessão inválida → desloga.
        if (!cached) { clearGuestSession(); nav({ to: "/" }); }
        return;
      }
      const fresh = r as unknown as Snapshot;
      setSnap(fresh);
      saveSnapshot("guest", c, fresh);
    } catch (err) {
      // Erro de rede (offline). Mantém o cache na tela; só notifica se não houver dados.
      console.warn("[visitante] falha ao carregar — usando cache", err);
      if (!cached) toast.error(t("offline.chunkErrorDesc"));
    } finally {
      setLoading(false);
    }
  }, [fn, nav, t]);

  useEffect(() => {
    const c = readGuestSession();
    if (!c) { nav({ to: "/" }); return; }
    setCode(c);
    load(c);
  }, [load, nav]);

  const [offlineOpen, setOfflineOpen] = useState(false);

  const exit = () => { clearGuestSession(); nav({ to: "/" }); };

  const [shareOpen, setShareOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const availableSections = useMemo<SectionKey[]>(() => {
    const all: SectionKey[] = ["cron", "estudos", "campo", "ref", "trans"];
    if (snap && !snap.wifeMode) all.push("check");
    return all;
  }, [snap]);
  const [selected, setSelected] = useState<Record<SectionKey, boolean>>({
    cron: true, estudos: true, campo: true, ref: true, trans: true, check: true,
  });
  const toggle = (k: SectionKey) => setSelected((s) => ({ ...s, [k]: !s[k] }));

  const filenameBase = (snap?.visit?.title || "visita").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  const exportPng = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(previewRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      if (!blob) throw new Error("blob");
      await saveBlob(blob, {
        filename: `programacao-${filenameBase}.png`,
        mimeType: "image/png",
        pickerTypes: [{ description: "PNG", accept: { "image/png": [".png"] } }],
      });
      toast.success(t("guest.export.image"));
    } catch { toast.error(t("guest.export.imageFail")); }
  }, [filenameBase, t]);

  const exportPdf = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const dataUrl = await toPng(previewRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      pdf.addImage(dataUrl, "PNG", (pageW - w) / 2, margin, w, h);
      const blob = pdf.output("blob");
      await saveBlob(blob, {
        filename: `programacao-${filenameBase}.pdf`,
        mimeType: "application/pdf",
        pickerTypes: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
      toast.success(t("guest.export.pdf"));
    } catch { toast.error(t("guest.export.pdfFail")); }
  }, [filenameBase, t]);


  const shareWhatsapp = useCallback(() => {
    if (!snap || !snap.visit) return;
    const L: string[] = [];
    L.push(`*${snap.congregation.name}*`);
    L.push(`*${snap.visit.title}*`);
    L.push(`${fmtDate(snap.visit.start_date)} — ${fmtDate(snap.visit.end_date)}`);
    if (selected.cron && snap.schedule.length) {
      L.push("", `*${t("guest.sections.cron")}*`);
      snap.schedule.forEach((e) => L.push(`• ${fmtDate(e.event_date)} ${fmtTime(e.start_time)} — ${e.title}${e.location ? ` (${e.location})` : ""}`));
    }
    if (selected.estudos && snap.field.length) {
      L.push("", `*${t("guest.sections.estudos")}*`);
      snap.field.forEach((f) => L.push(`• ${fmtDate(f.event_date)} ${f.period} ${fmtTime(f.meeting_time)}${f.meeting_point ? ` — ${f.meeting_point}` : ""}${f.acompanhante ? ` | ${t("guest.labels.companionShort")}: ${f.acompanhante}` : ""}`));
    }
    if (selected.campo && snap.fieldMeetings.length) {
      L.push("", `*${t("guest.sections.campo")}*`);
      snap.fieldMeetings.forEach((f) => L.push(`• ${fmtDate(f.event_date)} ${f.period} ${fmtTime(f.meeting_time)} — ${f.modality}${f.territory_location ? ` (${f.territory_location})` : ""}${f.auxiliary_leaders ? ` | ${t("guest.labels.auxLeaders")}: ${f.auxiliary_leaders}` : ""}`));
    }
    if (selected.ref && (snap.meals.length || snap.mealDayNotes.length)) {
      L.push("", `*${t("guest.sections.ref")}*`);
      snap.mealDayNotes.forEach((n) => L.push(`• ${fmtDate(n.meal_date)}: ${n.notes}`));
      snap.meals.forEach((m) => L.push(`• ${fmtDate(m.meal_date)} ${mealLabel(m.type)} ${fmtTime(m.meal_time)}${m.host_name ? ` — ${m.host_name}` : ""}${m.location ? ` (${m.location})` : ""}`));
    }
    if (selected.trans && snap.transport.length) {
      L.push("", `*${t("guest.sections.trans")}*`);
      snap.transport.forEach((tp) => L.push(`• ${tp.event_date ? fmtDate(tp.event_date) : t("guest.labels.noDate")} — ${tp.driver_name}${tp.contact_phone ? ` (${tp.contact_phone})` : ""}`));
    }
    if (selected.check && snap.checklist.length && !snap.wifeMode) {
      L.push("", `*${t("guest.sections.check")}*`);
      snap.checklist.forEach((c) => L.push(`• [${c.status}] ${c.title}${c.description ? ` — ${c.description}` : ""}`));
    }
    const text = encodeURIComponent(L.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [snap, selected, t, fmtDate, mealLabel]);

  if (loading || !snap) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <Logo className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{snap.congregation.name}</div>
              <div className="text-[11px] opacity-80">{snap.wifeMode ? t("guest.wifeMode") : t("guest.eldersMode")} • {t("guest.readOnlyTag")}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
                  <Share2 className="h-4 w-4 mr-1" /> {t("guest.share")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>{t("guest.shareTitle")}</DialogTitle>
                  <DialogDescription>{t("guest.shareDescription")}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-3 py-2 border-b">
                  {availableSections.map((k) => (
                    <Label key={k} className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                      <Checkbox checked={selected[k]} onCheckedChange={() => toggle(k)} />
                      {SECTION_LABELS[k]}
                    </Label>
                  ))}
                </div>

                <div className="overflow-auto flex-1 -mx-6 px-6 py-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-2">{t("guest.preview")}</div>
                  <div ref={previewRef} className="bg-white p-4 rounded shadow-sm">
                    <SharePreview snap={snap} selected={selected} fmtDate={fmtDate} mealLabel={mealLabel} />
                  </div>
                </div>

                <DialogFooter className="flex-row flex-wrap justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={exportPng}><ImageIcon className="h-4 w-4 mr-1" />PNG</Button>
                  <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
                  <Button size="sm" onClick={shareWhatsapp}><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOfflineOpen(true)}
              className="text-primary-foreground hover:bg-white/10"
              title={t("offline.modeTitle")}
            >
              <CloudDownload className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">{t("offline.activate")}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={exit} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-1" /> {t("guest.exit")}
            </Button>
          </div>
        </div>
      </header>
      <GuestOfflineDialog open={offlineOpen} onOpenChange={setOfflineOpen} />

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {!snap.visit ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
            {t("guest.noActiveVisit")}
          </CardContent></Card>
        ) : (
          <>
            <Card><CardContent className="p-4">
              <h1 className="font-semibold">{snap.visit.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmtDate(snap.visit.start_date)} — {fmtDate(snap.visit.end_date)}
              </p>
            </CardContent></Card>

            <Tabs defaultValue="hoje">
              <TabsList className={`grid w-full ${snap.wifeMode ? "grid-cols-6" : "grid-cols-7"}`}>
                <TabsTrigger value="hoje"><Sun className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.today")}</span></TabsTrigger>
                <TabsTrigger value="cron"><CalendarDays className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.schedule")}</span></TabsTrigger>
                <TabsTrigger value="estudos"><Users className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.studies")}</span></TabsTrigger>
                <TabsTrigger value="campo"><Compass className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.field")}</span></TabsTrigger>
                <TabsTrigger value="ref"><UtensilsCrossed className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.meals")}</span></TabsTrigger>
                <TabsTrigger value="trans"><Car className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.transport")}</span></TabsTrigger>
                {!snap.wifeMode && (
                  <TabsTrigger value="check"><ListChecks className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.checklist")}</span></TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="hoje" className="mt-4">
                <TodayDashboard snap={snap} />
              </TabsContent>

              <TabsContent value="cron" className="space-y-2 mt-4">
                {snap.schedule.length === 0 ? <Empty text={t("guest.empty.schedule")} /> :
                  snap.schedule.map((e) => (
                    <Card key={e.id}><CardContent className="p-3 flex gap-3">
                      <div className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 min-w-[70px] text-center">
                        <div>{format(parseISO(e.event_date), "dd/MM")}</div>
                        <div><Clock className="inline h-3 w-3" /> {fmtTime(e.start_time)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{e.title}</div>
                        {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
                        {e.notes && <div className="text-xs text-muted-foreground mt-1">{e.notes}</div>}
                      </div>
                    </CardContent></Card>
                  ))}
              </TabsContent>

              <TabsContent value="estudos" className="space-y-2 mt-4">
                {snap.field.length === 0 ? <Empty text={t("guest.empty.studies")} /> :
                  snap.field.map((f) => (
                    <Card key={f.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{fmtDate(f.event_date)} • {f.period}</div>
                        {f.meeting_time && <span className="text-xs"><Clock className="inline h-3 w-3" /> {fmtTime(f.meeting_time)}</span>}
                      </div>
                      {f.meeting_point && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.meeting_point}</div>}
                      {f.acompanhante && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.companion")}: </span>{f.acompanhante}{f.acompanhante_for ? ` (${t("guest.labels.withCompanion")} ${f.acompanhante_for})` : ""}</div>}
                      {f.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{f.contact_phone}</div>}
                    </CardContent></Card>
                  ))}
              </TabsContent>

              <TabsContent value="campo" className="space-y-2 mt-4">
                {snap.fieldMeetings.length === 0 ? <Empty text={t("guest.empty.field")} /> :
                  snap.fieldMeetings.map((f) => (
                    <Card key={f.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{fmtDate(f.event_date)} • {f.period}</div>
                        {f.meeting_time && <span className="text-xs"><Clock className="inline h-3 w-3" /> {fmtTime(f.meeting_time)}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("guest.labels.modality")}: {f.modality}</div>
                      {f.territory_number && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.territoryS13")}: </span>{f.territory_number}</div>}
                      {f.territory_location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.territory_location}</div>}
                      {f.auxiliary_leaders && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.auxLeaders")}: </span>{f.auxiliary_leaders}</div>}
                      {f.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{f.closing_prayer}</div>}
                    </CardContent></Card>
                  ))}
              </TabsContent>

              <TabsContent value="ref" className="space-y-2 mt-4">
                {snap.meals.length === 0 && snap.mealDayNotes.length === 0 ? <Empty text={t("guest.empty.meals")} /> : (() => {
                  const noteMap = new Map(snap.mealDayNotes.map((n) => [n.meal_date, n.notes]));
                  const dates = Array.from(new Set([...snap.meals.map((m) => m.meal_date), ...snap.mealDayNotes.map((n) => n.meal_date)])).sort();
                  return dates.map((date) => {
                    const note = noteMap.get(date);
                    const dayMeals = snap.meals.filter((m) => m.meal_date === date);
                    return (
                      <div key={date} className="space-y-1">
                        {note && <div className="text-sm font-medium text-destructive px-1 whitespace-pre-wrap">{note}</div>}
                        {dayMeals.map((m) => (
                          <Card key={m.id}><CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{fmtDate(m.meal_date)} • {mealLabel(m.type)}</div>
                              {m.meal_time && <span className="text-xs"><Clock className="inline h-3 w-3" /> {fmtTime(m.meal_time)}</span>}
                            </div>
                            {m.host_name && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.host")}: </span>{m.host_name}</div>}
                            {m.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</div>}
                            {m.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{m.contact_phone}</div>}
                            {m.notes && <div className="text-xs text-muted-foreground">{m.notes}</div>}
                          </CardContent></Card>
                        ))}
                      </div>
                    );
                  });
                })()}
              </TabsContent>

              <TabsContent value="trans" className="space-y-2 mt-4">
                {snap.transport.length === 0 ? <Empty text={t("guest.empty.transport")} /> :
                  snap.transport.map((tp) => (
                    <Card key={tp.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{tp.event_date ? fmtDate(tp.event_date) : t("guest.labels.noDate")}</div>
                      </div>
                      <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.driver")}: </span>{tp.driver_name}</div>
                      {tp.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{tp.contact_phone}</div>}
                      {tp.description && <div className="text-xs text-muted-foreground">{tp.description}</div>}
                      {tp.notes && <div className="text-xs text-muted-foreground">{tp.notes}</div>}
                    </CardContent></Card>
                  ))}
              </TabsContent>

              {!snap.wifeMode && (
                <TabsContent value="check" className="space-y-2 mt-4">
                  {snap.checklist.length === 0 ? <Empty text={t("guest.empty.checklist")} /> :
                    snap.checklist.map((c) => (
                      <Card key={c.id}><CardContent className="p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm break-words min-w-0 flex-1">{c.title}</div>
                          <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground shrink-0">{c.status}</span>
                        </div>
                        {c.description && <div className="text-xs text-muted-foreground break-words">{c.description}</div>}
                        {c.info_text && <div className="text-xs text-muted-foreground break-words">{c.info_text}</div>}
                        {c.link_or_notes && <div className="text-xs break-words">{c.link_or_notes}</div>}
                      </CardContent></Card>
                    ))}
                </TabsContent>
              )}
            </Tabs>
          </>
        )}

        <div className="text-center pt-4">
          <Button variant="outline" size="sm" onClick={() => code && load(code)}>{t("guest.refresh")}</Button>
        </div>
      </main>
    </div>
  );
}

function TodayDashboard({ snap }: { snap: Snapshot }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "EEEE, d MMMM", { locale: dateLocale });

  const mealLabel = (type: string) => type === "lunch" ? t("guest.meal.lunch") : type === "dinner" ? t("guest.meal.dinner") : t("guest.meal.breakfast");

  const todayMeals = snap.meals.filter((m) => m.meal_date === todayIso);
  const todayNote = snap.mealDayNotes.find((n) => n.meal_date === todayIso);
  const todayTransport = snap.transport.filter((tp) => tp.event_date === todayIso);
  const todayField = snap.field.filter((f) => f.event_date === todayIso);
  const todayFieldMeetings = snap.fieldMeetings.filter((f) => f.event_date === todayIso);
  const todaySchedule = snap.schedule.filter((e) => e.event_date === todayIso);

  const inVisit = snap.visit
    ? todayIso >= snap.visit.start_date && todayIso <= snap.visit.end_date
    : false;

  const isSameDay = (iso: string | null) => !!iso && iso.slice(0, 10) === todayIso;
  const todayWeekend = snap.weekend.filter((w) => isSameDay(w.meeting_at));
  const todayPioneer = snap.pioneer.filter(
    (p) => isSameDay(p.meeting_at) || isSameDay(p.super_meeting_at),
  );
  const showMidweek = inVisit && snap.midweek.length > 0;
  const showElders = inVisit && snap.elders.length > 0;

  const hasMeetings =
    todayWeekend.length > 0 || todayPioneer.length > 0 || showMidweek || showElders;

  const fmtAt = (iso: string | null) => (iso ? format(parseISO(iso), "HH:mm") : "—");

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("guest.today.summary")}</div>
          <div className="font-semibold capitalize">{todayLabel}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <UtensilsCrossed className="h-4 w-4" /> {t("guest.today.meals")}
          </div>
          {todayNote && (
            <div className="text-sm font-medium text-destructive whitespace-pre-wrap">{todayNote.notes}</div>
          )}
          {todayMeals.length === 0 && !todayNote ? (
            <div className="text-xs text-muted-foreground">{t("guest.today.noMeals")}</div>
          ) : (
            todayMeals.map((m) => (
              <div key={m.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">{mealLabel(m.type)} • {fmtTime(m.meal_time)}</div>
                {m.host_name && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.host")}: </span>{m.host_name}</div>}
                {m.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</div>}
                {m.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{m.contact_phone}</div>}
                {m.notes && <div className="text-xs text-muted-foreground">{m.notes}</div>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Car className="h-4 w-4" /> {t("guest.today.transport")}
          </div>
          {todayTransport.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("guest.today.noTransport")}</div>
          ) : (
            todayTransport.map((tp) => (
              <div key={tp.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">{tp.driver_name}</div>
                {tp.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{tp.contact_phone}</div>}
                {tp.description && <div className="text-xs text-muted-foreground">{tp.description}</div>}
                {tp.notes && <div className="text-xs text-muted-foreground">{tp.notes}</div>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {(todayField.length > 0 || todayFieldMeetings.length > 0) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Users className="h-4 w-4" /> {t("guest.today.studiesField")}
            </div>
            {todayField.map((f) => (
              <div key={f.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">{f.period} • {fmtTime(f.meeting_time)}</div>
                {f.meeting_point && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.meeting_point}</div>}
                {f.acompanhante && <div className="text-xs">{t("guest.labels.companion")}: {f.acompanhante}</div>}
              </div>
            ))}
            {todayFieldMeetings.map((f) => (
              <div key={f.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">{f.period} • {fmtTime(f.meeting_time)} • {f.modality}</div>
                {f.territory_location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.territory_location}</div>}
                {f.auxiliary_leaders && <div className="text-xs">{t("guest.labels.leaders")}: {f.auxiliary_leaders}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Mic className="h-4 w-4" /> {t("guest.today.meetings")}
          </div>
          {!hasMeetings ? (
            <div className="text-xs text-muted-foreground">{t("guest.today.noMeetings")}</div>
          ) : (
            <>
              {showMidweek && snap.midweek.map((m) => (
                <div key={m.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.midweek")}</div>
                  {m.chairman && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.chairman")}: </span>{m.chairman}</div>}
                  {m.service_talk_theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.serviceTalk")}: </span>{m.service_talk_theme}</div>}
                  {m.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{m.closing_prayer}</div>}
                </div>
              ))}
              {todayWeekend.map((w) => (
                <div key={w.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.weekend")} • {fmtAt(w.meeting_at)}</div>
                  {w.public_talk_theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.publicTalk")}: </span>{w.public_talk_theme}</div>}
                  {w.talk_theme_title && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.finalTalk")}: </span>{w.talk_theme_title}</div>}
                </div>
              ))}
              {todayPioneer.map((p) => (
                <div key={p.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.pioneer")} • {fmtAt(p.meeting_at)}</div>
                  {p.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</div>}
                  {p.theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.theme")}: </span>{p.theme}</div>}
                  {p.opening_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.openingPrayer")}: </span>{p.opening_prayer}</div>}
                  {p.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{p.closing_prayer}</div>}
                </div>
              ))}
              {showElders && snap.elders.map((e) => (
                <div key={e.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.elders")}</div>
                  {e.theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.theme")}: </span>{e.theme}</div>}
                  {e.opening_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.openingPrayer")}: </span>{e.opening_prayer}</div>}
                  {e.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{e.closing_prayer}</div>}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {todaySchedule.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CalendarDays className="h-4 w-4" /> {t("guest.today.otherEvents")}
            </div>
            {todaySchedule.map((e) => (
              <div key={e.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">{fmtTime(e.start_time)} — {e.title}</div>
                {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
                {e.notes && <div className="text-xs text-muted-foreground">{e.notes}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-center pt-2 text-xs text-muted-foreground">
        {t("guest.openSchedule")} <span className="font-medium">{t("guest.scheduleTab")}</span>.
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{text}</CardContent></Card>;
}

function SharePreview({ snap, selected, fmtDate, mealLabel }: { snap: Snapshot; selected: Record<SectionKey, boolean>; fmtDate: (d: string) => string; mealLabel: (t: string) => string }) {
  const { t } = useTranslation();
  if (!snap.visit) return <div className="text-sm text-gray-500">{t("guest.noActiveVisitShort")}</div>;
  const noteMap = new Map(snap.mealDayNotes.map((n) => [n.meal_date, n.notes]));
  const mealDates = Array.from(new Set([...snap.meals.map((m) => m.meal_date), ...snap.mealDayNotes.map((n) => n.meal_date)])).sort();
  const anySelected = Object.entries(selected).some(([, v]) => v);

  return (
    <div className="text-gray-900 text-sm space-y-3">
      <div className="border-b pb-2">
        <div className="font-semibold text-base">{snap.congregation.name}</div>
        <div className="font-medium">{snap.visit.title}</div>
        <div className="text-xs text-gray-600">{fmtDate(snap.visit.start_date)} — {fmtDate(snap.visit.end_date)}</div>
      </div>

      {!anySelected && <div className="text-xs text-gray-500 italic">{t("guest.empty.selectSection")}</div>}

      {selected.cron && (
        <Section title={t("guest.sections.cron")} empty={snap.schedule.length === 0}>
          {snap.schedule.map((e) => (
            <div key={e.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{fmtDate(e.event_date)} • {fmtTime(e.start_time)} — {e.title}</div>
              {e.location && <div className="text-xs text-gray-600">📍 {e.location}</div>}
              {e.notes && <div className="text-xs text-gray-600">{e.notes}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.estudos && (
        <Section title={t("guest.sections.estudos")} empty={snap.field.length === 0}>
          {snap.field.map((f) => (
            <div key={f.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{fmtDate(f.event_date)} • {f.period} • {fmtTime(f.meeting_time)}</div>
              {f.meeting_point && <div className="text-xs text-gray-600">📍 {f.meeting_point}</div>}
              {f.acompanhante && <div className="text-xs">{t("guest.labels.companionShort")}: {f.acompanhante}{f.acompanhante_for ? ` (${t("guest.labels.withCompanion")} ${f.acompanhante_for})` : ""}</div>}
              {f.contact_phone && <div className="text-xs">📞 {f.contact_phone}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.campo && (
        <Section title={t("guest.sections.campo")} empty={snap.fieldMeetings.length === 0}>
          {snap.fieldMeetings.map((f) => (
            <div key={f.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{fmtDate(f.event_date)} • {f.period} • {fmtTime(f.meeting_time)}</div>
              <div className="text-xs">{t("guest.labels.modality")}: {f.modality}</div>
              {f.territory_number && <div className="text-xs">{t("guest.labels.territoryS13")}: {f.territory_number}</div>}
              {f.territory_location && <div className="text-xs text-gray-600">📍 {f.territory_location}</div>}
              {f.auxiliary_leaders && <div className="text-xs">{t("guest.labels.auxLeaders")}: {f.auxiliary_leaders}</div>}
              {f.closing_prayer && <div className="text-xs">{t("guest.labels.closingPrayer")}: {f.closing_prayer}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.ref && (
        <Section title={t("guest.sections.ref")} empty={mealDates.length === 0}>
          {mealDates.map((date) => {
            const note = noteMap.get(date);
            const dayMeals = snap.meals.filter((m) => m.meal_date === date);
            return (
              <div key={date} className="py-1 border-b border-gray-100 last:border-0">
                {note && <div className="text-xs text-red-700 font-medium whitespace-pre-wrap">{note}</div>}
                {dayMeals.map((m) => (
                  <div key={m.id} className="text-xs">
                    <span className="font-medium">{fmtDate(m.meal_date)} • {mealLabel(m.type)} • {fmtTime(m.meal_time)}</span>
                    {m.host_name && <> — {m.host_name}</>}
                    {m.location && <> ({m.location})</>}
                  </div>
                ))}
              </div>
            );
          })}
        </Section>
      )}

      {selected.trans && (
        <Section title={t("guest.sections.trans")} empty={snap.transport.length === 0}>
          {snap.transport.map((tp) => (
            <div key={tp.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{tp.event_date ? fmtDate(tp.event_date) : t("guest.labels.noDate")} — {tp.driver_name}</div>
              {tp.contact_phone && <div className="text-xs">📞 {tp.contact_phone}</div>}
              {tp.description && <div className="text-xs text-gray-600">{tp.description}</div>}
              {tp.notes && <div className="text-xs text-gray-600">{tp.notes}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.check && !snap.wifeMode && (
        <Section title={t("guest.sections.check")} empty={snap.checklist.length === 0}>
          {snap.checklist.map((c) => (
            <div key={c.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">[{c.status}] {c.title}</div>
              {c.description && <div className="text-xs text-gray-600">{c.description}</div>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="font-semibold text-sm border-b border-gray-300 mb-1 pb-0.5">{title}</div>
      {empty ? <div className="text-xs text-gray-400 italic">{t("guest.empty.section")}</div> : <div>{children}</div>}
    </div>
  );
}
