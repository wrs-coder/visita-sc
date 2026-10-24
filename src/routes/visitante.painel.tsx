import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EventReminderSync, ReminderSettingsCard } from "@/components/reminders/EventReminders";
import type { TimelineSource } from "@/lib/today-timeline";
import { setVisibleInterval } from "@/lib/visible-interval";
import { readFnWithMirrorSafe } from "@/lib/local-first";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { readGuestSession, clearGuestSession, setSelectedCongregation, setWeekAnchor } from "@/lib/guest-session";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { LogOut, CalendarDays, UtensilsCrossed, Users, Car, MapPin, Clock, Phone, ListChecks, Compass, Share2, Image as ImageIcon, FileDown, MessageCircle, Sun, Mic, CloudDownload, Heart, Send, Plus, ChevronLeft, ChevronRight, BookOpen, ChevronDown, Moon, MoreVertical } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/use-theme";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import { saveBlob } from "@/lib/share";
import { saveSnapshot, loadSnapshot, snapshotSavedAt } from "@/lib/snapshot-cache";
import { GuestOfflineDialog } from "@/components/GuestOfflineDialog";
import { TemplateExtraBlock } from "@/components/meetings/TemplateExtraBlock";
import { wifeListCoupleMessages, wifeCreateCoupleMessage, wifeMarkCoupleMessagesRead, type CoupleThread } from "@/lib/couple-messages.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ElderProgramEvent } from "@/components/visit-summary/ElderProgramReadOnly";
import { MeetingsTalksPanel, type MeetingsTalksSnap } from "@/components/visit-summary/MeetingsTalksPanel";
import { ElderTabGate } from "@/components/visit-summary/ElderTabGate";
import { GuestSectionNav, GuestWorkspace, useGuestSection } from "@/components/guest-workspace/GuestWorkspace";
import { TodayStudyFieldCards } from "@/components/visit-summary/TodayStudyFieldCards";
import { FoldCard, FoldAllButton } from "@/components/visit-summary/FoldCard";
import { InfoList } from "@/components/visit-summary/InfoList";
import { formatWeekdayTime, formatAnchorWeekdayTime, anchorWeekday } from "@/components/visit-week/report-schedule";


export const Route = createFileRoute("/visitante/painel")({ component: Page });

interface Snapshot {
  wifeMode: boolean;
  congregation: { id: string; name: string };
  availableCongregations?: Array<{ id: string; name: string }> | null;
  selectedCongregationId?: string | null;
  visit: { id: string; title: string; start_date: string; end_date: string } | null;
  schedule: Array<{ id: string; event_date: string; start_time: string | null; end_time: string | null; title: string; location: string | null; type: string; notes: string | null }>;
  meals: Array<{ id: string; meal_date: string; type: string; host_name: string | null; location: string | null; meal_time: string | null; contact_phone: string | null; notes: string | null }>;
  mealDayNotes: Array<{ meal_date: string; notes: string }>;
  field: Array<{ id: string; event_date: string; period: string; meeting_point: string | null; meeting_time: string | null; acompanhante: string | null; acompanhante_for: string | null; contact_phone: string | null; notes?: string | null }>;
  fieldMeetings: Array<{ id: string; event_date: string; period: string; modality: string; meeting_time: string | null; meeting_location?: string | null; territory_number: string | null; territory_location: string | null; auxiliary_leaders: string | null; closing_prayer: string | null; observations: string | null }>;
  transport: Array<{
    id: string;
    event_date: string | null;
    driver_name: string;
    contact_phone: string | null;
    description: string | null;
    notes: string | null;
    weekday?: number | null;
    event_type?: string | null;
    direction?: string | null;
    all_day?: boolean | null;
    departure_time?: string | null;
    return_time?: string | null;
  }>;
  checklist: Array<{ id: string; title: string; description: string | null; status: string; link_or_notes: string | null; info_text: string | null }>;
  midweek: Array<{ id: string; meeting_at?: string | null; chairman: string | null; service_talk_theme: string | null; closing_prayer: string | null }>;
  weekend: Array<{ id: string; meeting_at: string | null; public_talk_theme: string | null; talk_theme_title: string | null }>;
  pioneer: Array<{ id: string; meeting_at: string | null; super_meeting_at: string | null; location: string | null; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }>;
  elders: Array<{ id: string; meeting_at?: string | null; location?: string | null; theme: string | null; opening_prayer: string | null; closing_prayer: string | null }>;
  elderProgram?: {
    sections: { pastoral: string; encouragement: string; recommendations: string; local: string };
    slots: Array<{ id: string; label: string }>;
    pastoral: ElderProgramEvent[];
    encouragement: ElderProgramEvent[];
    recommendations: ElderProgramEvent[];
    local: ElderProgramEvent[];
  } | null;
  templateExtras?: {
    field: { observations: string | null } | null;
    midweek: { observations: string | null; final_song?: string | null } | null;
    weekend: { opening_song: string | null; closing_song: string | null; observations: string | null } | null;
    pioneer: { observations: string | null; weekday?: number | null; meeting_time?: string | null } | null;
    elders: { observations: string | null; weekday?: number | null; meeting_time?: string | null } | null;
    program: { general_observations: string | null } | null;
  };
}

const FINAL_SONG = "Cântico final";
// Mesmo dia/horário da aba "Reuniões e Discursos" (modelo ou ajuste da visita).
function pioneerWhen(snap: Snapshot): string {
  return formatWeekdayTime(snap.templateExtras?.pioneer?.weekday, snap.templateExtras?.pioneer?.meeting_time);
}
function eldersWhen(snap: Snapshot): string {
  return formatWeekdayTime(snap.templateExtras?.elders?.weekday, snap.templateExtras?.elders?.meeting_time);
}




type TransportRow = Snapshot["transport"][number];

/** Agrupa transportes por `event_date` (mesmo padrão da aba Transporte / Resumo). */
function groupTransport(rows: TransportRow[]): Array<{ key: string; rows: TransportRow[] }> {
  const map = new Map<string, TransportRow[]>();
  for (const it of rows) {
    const key = it.event_date ?? `__none__:${it.id}`;
    const arr = map.get(key) ?? [];
    arr.push(it);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([key, rs]) => ({ key, rows: rs }));
}

type SectionKey = "cron" | "estudos" | "campo" | "reunioes" | "ref" | "trans" | "pastoreios" | "check";

const ELDER_UNLOCK_PREFIX = "elderTabUnlocked:";
function isElderUnlocked(congregationId: string | undefined): boolean {
  if (!congregationId || typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ELDER_UNLOCK_PREFIX + congregationId) === "1";
  } catch {
    return false;
  }
}

function fmtTime(t: string | null) { return t ? t.slice(0, 5) : "—"; }

function Page() {
  const [guestSection, setGuestSection] = useGuestSection();
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
    reunioes: t("guest.sections.reunioes"),
    ref: t("guest.sections.ref"),
    trans: t("guest.sections.trans"),
    pastoreios: t("guest.sections.pastoreios"),
    check: t("guest.sections.check"),
  }), [t]);

  const load = useCallback(async (c: string, congregationId?: string | null, opts?: { pickCurrent?: boolean }) => {
    // Hidrata imediatamente do cache local para funcionar offline.
    const cacheKey = congregationId ? `${c}:${congregationId}` : c;
    const cached = loadSnapshot<Snapshot>("guest", cacheKey);
    if (cached && !opts?.pickCurrent) {
      setSnap(cached);
      setLoading(false);
      // Acabou de ser baixado na tela de entrada: não repete a consulta.
      const at = snapshotSavedAt("guest", cacheKey);
      if (at && Date.now() - at < 60_000) return;
    } else {
      setLoading(true);
    }
    try {
      const r = await fn({ data: { inviteCode: c, congregationId: congregationId ?? undefined, pickCurrent: opts?.pickCurrent } });
      if (!(r as { ok: boolean }).ok) {
        // Resposta explícita do servidor: sessão inválida → desloga.
        if (!cached) { clearGuestSession(); nav({ to: "/" }); }
        return;
      }
      const fresh = r as unknown as Snapshot;
      setSnap(fresh);
      // Se o servidor escolheu uma congregação (pickCurrent), persiste a escolha.
      if (opts?.pickCurrent && fresh.selectedCongregationId) {
        setSelectedCongregation(fresh.selectedCongregationId);
      }
      const freshKey = fresh.selectedCongregationId ? `${c}:${fresh.selectedCongregationId}` : cacheKey;
      saveSnapshot("guest", freshKey, fresh);
    } catch (err) {
      // Erro de rede (offline). Mantém o cache na tela; só notifica se não houver dados.
      console.warn("[visitante] falha ao carregar — usando cache", err);
      if (!cached) toast.error(t("offline.chunkErrorDesc"));
    } finally {
      setLoading(false);
    }
  }, [fn, nav, t]);

  useEffect(() => {
    const session = readGuestSession();
    if (!session) { nav({ to: "/" }); return; }
    setCode(session.code);
    // Carrega o cache e, em paralelo, pede ao servidor para escolher a
    // congregação cuja visita ativa cobre a semana atual (apenas na primeira
    // sessão sem congregação salva — preserva escolha manual posterior).
    load(session.code, session.congregationId, { pickCurrent: !session.congregationId });
  }, [load, nav]);

  // Mission 3: alternador "Hoje / Próximo dia" para o cartão do dia.
  const [dayOffset, setDayOffset] = useState(0);
  const [currentTab, setCurrentTab] = useState("hoje");

  const [offlineOpen, setOfflineOpen] = useState(false);

  const exit = () => { clearGuestSession(); nav({ to: "/" }); };

  const [shareOpen, setShareOpen] = useState(false);
  const [themeMode, setThemeMode] = useTheme();
  const headerHidden = useHideOnScroll();
  const previewRef = useRef<HTMLDivElement>(null);
  const availableSections = useMemo<SectionKey[]>(() => {
    const all: SectionKey[] = ["cron", "estudos", "campo", "reunioes", "ref", "trans"];
    if (snap && !snap.wifeMode) {
      if (isElderUnlocked(snap.congregation.id)) all.push("pastoreios");
      all.push("check");
    }
    return all;
  }, [snap]);
  const [selected, setSelected] = useState<Record<SectionKey, boolean>>({
    cron: true, estudos: true, campo: true, reunioes: true, ref: true, trans: true, pastoreios: true, check: true,
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
    if (selected.reunioes && (snap.midweek.length || snap.weekend.length || snap.pioneer.length || snap.elders.length)) {
      L.push("", `*${t("guest.sections.reunioes")}*`);
      snap.midweek.forEach((m) => {
        const parts = [t("guest.meetingsTalks.midweek")];
        if (m.meeting_at) parts.push(formatAnchorWeekdayTime(m.meeting_at));
        if (m.chairman) parts.push(`${t("guest.labels.chairman")}: ${m.chairman}`);
        if (m.service_talk_theme) parts.push(`${t("guest.labels.serviceTalk")}: ${m.service_talk_theme}`);
        L.push(`• ${parts.join(" — ")}`);
      });
      snap.weekend.forEach((w) => {
        const parts = [t("guest.meetingsTalks.weekend")];
        if (w.meeting_at) parts.push(formatAnchorWeekdayTime(w.meeting_at));
        if (w.public_talk_theme) parts.push(`${t("guest.labels.publicTalk")}: ${w.public_talk_theme}`);
        if (w.talk_theme_title) parts.push(w.talk_theme_title);
        L.push(`• ${parts.join(" — ")}`);
      });
      snap.pioneer.forEach((p) => {
        const parts = [t("guest.meetingsTalks.pioneer")];
        parts.push(pioneerWhen(snap));
        if (p.location) parts.push(p.location);
        if (p.theme) parts.push(`${t("guest.labels.theme")}: ${p.theme}`);
        L.push(`• ${parts.join(" — ")}`);
      });
      snap.elders.forEach((e) => {
        const parts = [t("guest.meetingsTalks.elders")];
        parts.push(eldersWhen(snap));
        if (e.location) parts.push(e.location);
        if (e.theme) parts.push(`${t("guest.labels.theme")}: ${e.theme}`);
        L.push(`• ${parts.join(" — ")}`);
      });
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
    if (selected.pastoreios && !snap.wifeMode && snap.elderProgram && isElderUnlocked(snap.congregation.id)) {
      const ep = snap.elderProgram;
      const groups: Array<[string, Array<{ slot_label: string | null; family_name?: string | null; person_name?: string | null; full_name?: string | null; subject?: string | null }>]> = [
        [ep.sections.pastoral, ep.pastoral],
        [ep.sections.encouragement, ep.encouragement],
        [ep.sections.recommendations, ep.recommendations],
        [ep.sections.local, ep.local],
      ];
      const hasAny = groups.some(([, list]) => list.length > 0);
      if (hasAny) {
        L.push("", `*${t("guest.sections.pastoreios")}*`);
        for (const [title, list] of groups) {
          if (!list.length) continue;
          L.push(`_${title}_`);
          list.forEach((it) => {
            const label = it.slot_label ?? "";
            const name = it.family_name ?? it.person_name ?? it.full_name ?? it.subject ?? "—";
            L.push(`• ${label ? `${label}: ` : ""}${name}`);
          });
        }
      }
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
      <header className={cn("sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm transition-transform duration-200", headerHidden && "-translate-y-full")}>
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 h-12">
          <Logo className="h-6 w-6 shrink-0" />
          {snap.availableCongregations && snap.availableCongregations.length > 0 && code ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-1 text-left text-sm font-semibold hover:bg-primary-foreground/10">
                  <span className="truncate">{snap.congregation.name}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 space-y-2">
                <Label className="text-xs text-muted-foreground">{t("guest.congregationPicker.label")}</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                value={snap.selectedCongregationId ?? snap.congregation.id}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCongregation(id);
                  setWeekAnchor(null);
                  if (code) load(code, id);
                }}
              >
                {snap.availableCongregations.map((c) => (
                  <option key={c.id} value={c.id} className="text-foreground">{c.name}</option>
                ))}
              </select>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setWeekAnchor(null); if (code) load(code, null, { pickCurrent: true }); }}>
                  <CalendarDays className="h-4 w-4 mr-1" />{t("guest.currentWeek")}
                </Button>
              </PopoverContent>
            </Popover>
          ) : <div className="min-w-0 flex-1 truncate text-sm font-semibold">{snap.congregation.name}</div>}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
            aria-pressed={themeMode === "dark"} aria-label={t("theme.darkMode", { defaultValue: "Modo escuro" })}
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}>
            {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10" aria-label={t("guest.menu", { defaultValue: "Menu" })}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{snap.wifeMode ? t("guest.wifeMode") : t("guest.eldersMode")} • {t("guest.readOnlyTag")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4 mr-2" />{t("guest.share")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOfflineOpen(true)}><CloudDownload className="h-4 w-4 mr-2" />{t("offline.activate")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5"><ThemeToggle /></div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exit}><LogOut className="h-4 w-4 mr-2" />{t("guest.exit")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
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
      <GuestOfflineDialog open={offlineOpen} onOpenChange={setOfflineOpen} />


      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {snap.wifeMode && <GuestSectionNav value={guestSection} onChange={setGuestSection} />}
        {snap.wifeMode && guestSection !== "week" ? (
          <GuestWorkspace key={guestSection} section={guestSection} />
        ) : !snap.visit ? (
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

            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className={`grid w-full ${snap.wifeMode ? "grid-cols-6" : "grid-cols-8"}`}>
                <TabsTrigger value="hoje"><Sun className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.today")}</span></TabsTrigger>
                <TabsTrigger value="estudos"><Users className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.studies")}</span></TabsTrigger>
                <TabsTrigger value="campo"><Compass className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.field")}</span></TabsTrigger>
                <TabsTrigger value="ref"><UtensilsCrossed className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.meals")}</span></TabsTrigger>
                <TabsTrigger value="trans"><Car className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.transport")}</span></TabsTrigger>
                {snap.wifeMode ? (
                  <TabsTrigger value="couple"><Heart className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.couple")}</span></TabsTrigger>
                ) : (
                  <>
                    <TabsTrigger value="reunioes"><Mic className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.meetings")}</span></TabsTrigger>
                    <TabsTrigger value="pastoreios"><BookOpen className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.pastoreios")}</span></TabsTrigger>
                    <TabsTrigger value="check"><ListChecks className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">{t("guest.tabs.checklist")}</span></TabsTrigger>
                  </>
                )}
              </TabsList>


              <TabsContent value="hoje" className="mt-4 space-y-4">
                <TodayDashboard snap={snap} dayOffset={dayOffset} setDayOffset={setDayOffset} code={code} onOpenCouple={() => setCurrentTab("couple")} />
                {snap.wifeMode && code && <GuestReminders snap={snap} code={code} />}
              </TabsContent>


              <TabsContent value="estudos" className="space-y-2 mt-4">
                {snap.field.length === 0 ? <Empty text={t("guest.empty.studies")} /> : (
                  <>
                    <FoldAllRow ids={snap.field.map((f) => `${tabFold}:st:${f.id}`)} />
                    {snap.field.map((f) => (
                      <FoldCard key={f.id} id={`${tabFold}:st:${f.id}`} title={<span className="font-medium">{fmtDate(f.event_date)} • {f.period}{f.meeting_time ? ` • ${fmtTime(f.meeting_time)}` : ""}</span>}>
                        <InfoList rows={[
                          [t("guest.labels.meetingPoint"), f.meeting_point],
                          [t("guest.labels.companion"), f.acompanhante],
                          [t("guest.labels.companionFor"), f.acompanhante_for],
                          [t("guest.labels.phone"), f.contact_phone],
                          [t("guest.labels.notes"), f.notes],
                        ]} />
                      </FoldCard>
                    ))}
                  </>
                )}
              </TabsContent>

              <TabsContent value="campo" className="space-y-2 mt-4">
                <TemplateExtraBlock
                  label={t("meetingsTalks.fromTemplate.fieldObservations")}
                  value={snap.templateExtras?.field?.observations}
                  variant="blue"
                />
                {snap.fieldMeetings.length === 0 ? <Empty text={t("guest.empty.field")} /> : (
                  <>
                    <FoldAllRow ids={snap.fieldMeetings.map((f) => `${tabFold}:fm:${f.id}`)} />
                    {snap.fieldMeetings.map((f) => (
                      <FoldCard key={f.id} id={`${tabFold}:fm:${f.id}`} title={<span className="font-medium">{fmtDate(f.event_date)} • {f.period}{f.meeting_time ? ` • ${fmtTime(f.meeting_time)}` : ""}</span>}>
                        <InfoList rows={[
                          [t("guest.labels.meetingPoint"), f.meeting_location],
                          [t("guest.labels.modality"), f.modality],
                          [t("guest.labels.territoryS13"), f.territory_number],
                          [t("guest.labels.territoryLocation"), f.territory_location],
                          [t("guest.labels.auxLeaders"), f.auxiliary_leaders],
                          [t("guest.labels.closingPrayer"), f.closing_prayer],
                        ]} />
                        {f.observations && f.observations.trim() && (
                          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2 py-1.5 mt-1">
                            <div className="text-[10px] uppercase tracking-wide font-medium text-blue-600 dark:text-blue-400 opacity-80">{t("meetingsTalks.fromTemplate.fieldObservations")}</div>
                            <div className="text-xs whitespace-pre-wrap text-blue-600 dark:text-blue-400">{f.observations}</div>
                          </div>
                        )}
                      </FoldCard>
                    ))}
                  </>
                )}
              </TabsContent>

              <TabsContent value="ref" className="space-y-2 mt-4">
                <TemplateExtraBlock
                  label={t("meals.generalObservationsLabel")}
                  value={snap.templateExtras?.program?.general_observations}
                />
                {snap.meals.length === 0 && snap.mealDayNotes.length === 0 ? <Empty text={t("guest.empty.meals")} /> : (() => {
                  const noteMap = new Map(snap.mealDayNotes.map((n) => [n.meal_date, n.notes]));
                  const dates = Array.from(new Set([...snap.meals.map((m) => m.meal_date), ...snap.mealDayNotes.map((n) => n.meal_date)])).sort();
                  return (
                    <>
                      <FoldAllRow ids={snap.meals.map((m) => `${tabFold}:ml:${m.id}`)} />
                      {dates.map((date) => {
                        const note = noteMap.get(date);
                        const dayMeals = snap.meals.filter((m) => m.meal_date === date);
                        return (
                          <div key={date} className="space-y-1">
                            {note && <div className="text-sm font-medium text-destructive px-1 whitespace-pre-wrap">{note}</div>}
                            {dayMeals.map((m) => (
                              <FoldCard key={m.id} id={`${tabFold}:ml:${m.id}`} title={<span className="font-medium">{fmtDate(m.meal_date)} • {mealLabel(m.type)}{m.meal_time ? ` • ${fmtTime(m.meal_time)}` : ""}</span>}>
                                <InfoList rows={[
                                  [t("guest.labels.host"), m.host_name],
                                  [t("guest.labels.location"), m.location],
                                  [t("guest.labels.phone"), m.contact_phone],
                                  [t("guest.labels.notes"), m.notes],
                                ]} />
                              </FoldCard>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="trans" className="space-y-2 mt-4">
                {snap.transport.length === 0 ? <Empty text={t("guest.empty.transport")} /> : (() => {
                  const groups = groupTransport(snap.transport);
                  return (
                    <>
                      <FoldAllRow ids={groups.map((g) => `${tabFold}:tr:${g.key}`)} />
                      {groups.map((g) => {
                        const head = g.rows[0];
                        return (
                          <FoldCard
                            key={g.key}
                            id={`${tabFold}:tr:${g.key}`}
                            icon={<Car className="h-4 w-4 text-primary" />}
                            title={
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{head.event_date ? fmtDate(head.event_date) : t("guest.labels.noDate")}</span>
                                {head.all_day && (
                                  <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-primary/15 text-primary">
                                    {t("transport.allDay", { defaultValue: "Apoiar todos os eventos/horários" })}
                                  </span>
                                )}
                              </span>
                            }
                          >
                            <div className="space-y-2">
                              {g.rows.map((r, idx) => {
                                const showDriver = !head.all_day || idx === 0;
                                const typeLbl = r.event_type ? t(`transport.eventType.${r.event_type}`, { defaultValue: r.event_type }) : null;
                                const dirLbl = r.direction ? t(`transport.direction.${r.direction}`, { defaultValue: r.direction }) : null;
                                return (
                                  <div key={r.id} className="rounded-md border bg-muted/20 p-2 space-y-1">
                                    {(typeLbl || dirLbl) && (
                                      <div className="text-xs font-medium">
                                        {typeLbl ?? t("transport.noDay")}
                                        {dirLbl ? ` · ${dirLbl}` : ""}
                                      </div>
                                    )}
                                    {(r.departure_time || r.return_time) && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {fmtTime(r.departure_time ?? null)}
                                        {r.return_time ? ` → ${fmtTime(r.return_time)}` : ""}
                                      </div>
                                    )}
                                    {showDriver && (
                                      <>
                                        <div className="text-xs">
                                          <span className="text-muted-foreground">{t("guest.labels.driver")}: </span>
                                          {r.driver_name}
                                        </div>
                                        {r.contact_phone && (
                                          <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{r.contact_phone}</div>
                                        )}
                                        {r.description && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{r.description}</div>}
                                        {r.notes && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{r.notes}</div>}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </FoldCard>
                        );
                      })}
                    </>
                  );
                })()}
              </TabsContent>

              {!snap.wifeMode && (
                <TabsContent value="reunioes" className="space-y-4 mt-4">
                  <MeetingsTalksPanel snap={snap as unknown as MeetingsTalksSnap} />
                </TabsContent>
              )}

              {!snap.wifeMode && (
                <TabsContent value="pastoreios" className="space-y-3 mt-4">
                  <ElderTabGate congregationId={snap.congregation.id} data={snap.elderProgram ?? null} />
                </TabsContent>
              )}

              {!snap.wifeMode && (
                <TabsContent value="check" className="space-y-2 mt-4">
                  {snap.checklist.length === 0 ? <Empty text={t("guest.empty.checklist")} /> : (
                    <>
                      <FoldAllRow ids={snap.checklist.map((c) => `${tabFold}:ck:${c.id}`)} />
                      {snap.checklist.map((c) => (
                        <FoldCard
                          key={c.id}
                          id={`${tabFold}:ck:${c.id}`}
                          title={
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-medium break-words min-w-0 flex-1">{c.title}</span>
                              <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground shrink-0">{c.status}</span>
                            </span>
                          }
                        >
                          {c.description && <div className="text-xs text-muted-foreground break-words">{c.description}</div>}
                          {c.info_text && <div className="text-xs text-muted-foreground break-words">{c.info_text}</div>}
                          {c.link_or_notes && <div className="text-xs break-words">{c.link_or_notes}</div>}
                        </FoldCard>
                      ))}
                    </>
                  )}
                </TabsContent>
              )}

              {snap.wifeMode && code && (
                <TabsContent value="couple" className="mt-4">
                  <WifeCouplePanel code={code} />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}

        {(!snap.wifeMode || guestSection === "week") && <div className="text-center pt-4">
          <Button variant="outline" size="sm" onClick={() => code && load(code, snap?.selectedCongregationId ?? null)}>{t("guest.refresh")}</Button>
        </div>}
      </main>
    </div>
  );
}

function TodayDashboard({
  snap,
  dayOffset,
  setDayOffset,
  code,
  onOpenCouple,
}: {
  snap: Snapshot;
  dayOffset: number;
  setDayOffset: (v: number) => void;
  code: string | null;
  onOpenCouple: () => void;
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const viewedDate = addDays(new Date(), dayOffset);
  const viewedIso = format(viewedDate, "yyyy-MM-dd");
  const viewedLabel = format(viewedDate, "EEEE, d MMMM", { locale: dateLocale });
  const isTomorrow = dayOffset === 1;
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const todayStart = parseISO(todayIso);
  // Dias da visita como pílulas; tocar leva o resumo para aquele dia.
  const dayPills = useMemo(() => {
    if (!snap.visit) return [];
    const out: Array<{ iso: string; weekday: string; day: string }> = [];
    let d = parseISO(snap.visit.start_date);
    const end = parseISO(snap.visit.end_date);
    for (let i = 0; d <= end && i < 14; i++, d = addDays(d, 1)) {
      out.push({ iso: format(d, "yyyy-MM-dd"), weekday: format(d, "EEE", { locale: dateLocale }), day: format(d, "dd/MM") });
    }
    return out;
  }, [snap.visit, dateLocale]);
  const goToIso = (iso: string) =>
    setDayOffset(Math.round((parseISO(iso).getTime() - todayStart.getTime()) / 86_400_000));
  // Eventos avulsos dos próximos dias (só na visão de hoje).
  const upcoming = dayOffset === 0
    ? snap.schedule
        .filter((e) => e.event_date > todayIso)
        .sort((a, b) => (a.event_date + (a.start_time ?? "")).localeCompare(b.event_date + (b.start_time ?? "")))
        .slice(0, 8)
    : [];

  const mealLabel = (type: string) => type === "lunch" ? t("guest.meal.lunch") : type === "dinner" ? t("guest.meal.dinner") : t("guest.meal.breakfast");

  const todayMeals = snap.meals.filter((m) => m.meal_date === viewedIso);
  const todayNote = snap.mealDayNotes.find((n) => n.meal_date === viewedIso);
  const todayTransport = snap.transport.filter((tp) => tp.event_date === viewedIso);
  const todayField = snap.field.filter((f) => f.event_date === viewedIso);
  const todayFieldMeetings = snap.fieldMeetings.filter((f) => f.event_date === viewedIso);
  const todaySchedule = snap.schedule.filter((e) => e.event_date === viewedIso);

  const inVisit = snap.visit
    ? viewedIso >= snap.visit.start_date && viewedIso <= snap.visit.end_date
    : false;

  const isSameDay = (iso: string | null | undefined) => !!iso && iso.slice(0, 10) === viewedIso;
  const viewedWeekdayEarly = (parseISO(viewedIso).getDay() + 6) % 7;
  const todayWeekend = snap.weekend.filter((w) => inVisit && anchorWeekday(w.meeting_at) === viewedWeekdayEarly);
  // Dia da semana do dia visualizado na ordem da aba (0 = Segunda … 6 = Domingo).
  const viewedWeekday = (parseISO(viewedIso).getDay() + 6) % 7;
  const pioWd = snap.templateExtras?.pioneer?.weekday ?? null;
  const eldWd = snap.templateExtras?.elders?.weekday ?? null;
  const todayPioneer = pioWd != null
    ? (inVisit && pioWd === viewedWeekday ? snap.pioneer : [])
    : snap.pioneer.filter((p) => isSameDay(p.meeting_at) || isSameDay(p.super_meeting_at));
  const todayMidweek = snap.midweek.filter((m) => inVisit && anchorWeekday(m.meeting_at) === viewedWeekday);
  const todayElders = eldWd != null
    ? (inVisit && eldWd === viewedWeekday ? snap.elders : [])
    : snap.elders.filter((e) => isSameDay(e.meeting_at));
  // Fallback: quando não houver dia definido, mostra dentro da visita
  // (compatibilidade com dados antigos).
  const showMidweek = todayMidweek.length > 0 || (inVisit && snap.midweek.some((m) => !m.meeting_at));
  const showElders = todayElders.length > 0 || (eldWd == null && inVisit && snap.elders.some((e) => !e.meeting_at));
  const midweekToRender = todayMidweek.length > 0 ? todayMidweek : snap.midweek.filter((m) => !m.meeting_at);
  const eldersToRender = todayElders.length > 0 ? todayElders : snap.elders.filter((e) => !e.meeting_at);

  const hasMeetings =
    todayWeekend.length > 0 || todayPioneer.length > 0 || showMidweek || showElders;

  const fmtAt = (iso: string | null | undefined) => (iso ? format(parseISO(iso), "HH:mm") : "—");
  // Recolher/expandir por cartão, salvo no aparelho e separado por código de acesso.
  const foldScope = `guest:${code ?? "local"}:hoje`;
  const foldIds = [
    "meals", "transport", "meetings",
    ...(todayField.length ? ["studies"] : []),
    ...(todayFieldMeetings.length ? ["field"] : []),
    ...(todaySchedule.length ? ["other"] : []),
    ...(upcoming.length ? ["upcoming"] : []),
  ].map((k) => `${foldScope}:${k}`);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {isTomorrow ? t("guest.today.summaryNext", { defaultValue: "Próximo dia" }) : t("guest.today.summary")}
              </div>
              {(dayPills.length === 0 || !inVisit) && (
                <div className="font-semibold capitalize">{viewedLabel}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {dayOffset !== 0 && (
                <Button size="sm" variant="ghost" onClick={() => setDayOffset(0)} className="h-7 px-2 shrink-0">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("dashboard.viewToday", { defaultValue: "Voltar para hoje" })}
                </Button>
              )}
              <FoldAllButton ids={foldIds} />
            </div>
          </div>
          {dayPills.length > 0 && (
            <DayPillsStrip
              pills={dayPills}
              viewedIso={viewedIso}
              todayIso={todayIso}
              todayLabel={t("dashboard.today", { defaultValue: "Hoje" })}
              ariaLabel={t("guest.today.days", { defaultValue: "Dias da visita" })}
              onPick={goToIso}
            />
          )}
        </CardContent>
      </Card>

      {snap.wifeMode && code && <WifeCoupleSummaryCard code={code} onOpen={onOpenCouple} />}

      <FoldCard id={`${foldScope}:meals`} icon={<UtensilsCrossed className="h-4 w-4" />} title={t("guest.today.meals")}>
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
                {m.notes && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{m.notes}</div>}
              </div>
            ))
          )}
          {snap.templateExtras?.program?.general_observations && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs whitespace-pre-wrap">
              <div className="text-[10px] uppercase tracking-wide font-medium text-primary/80">
                {t("meals.generalObservationsLabel")}
              </div>
              {snap.templateExtras.program.general_observations}
            </div>
          )}
      </FoldCard>

      <FoldCard id={`${foldScope}:transport`} icon={<Car className="h-4 w-4" />} title={t("guest.today.transport")}>
          {todayTransport.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("guest.today.noTransport")}</div>
          ) : (
            groupTransport(todayTransport).map((g) => {
              const head = g.rows[0];
              return (
                <div key={g.key} className="space-y-2">
                  {head.all_day && (
                    <div className="text-[10px] uppercase tracking-wide inline-block rounded px-1.5 py-0.5 bg-primary/15 text-primary">
                      {t("transport.allDay", { defaultValue: "Apoiar todos os eventos/horários" })}
                    </div>
                  )}
                  {g.rows.map((r, idx) => {
                    const showDriver = !head.all_day || idx === 0;
                    const typeLbl = r.event_type ? t(`transport.eventType.${r.event_type}`, { defaultValue: r.event_type }) : null;
                    const dirLbl = r.direction ? t(`transport.direction.${r.direction}`, { defaultValue: r.direction }) : null;
                    return (
                      <div key={r.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1 space-y-0.5">
                        {(typeLbl || dirLbl) && (
                          <div className="text-xs font-medium">
                            {typeLbl ?? t("transport.noDay")}
                            {dirLbl ? ` · ${dirLbl}` : ""}
                          </div>
                        )}
                        {(r.departure_time || r.return_time) && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmtTime(r.departure_time ?? null)}
                            {r.return_time ? ` → ${fmtTime(r.return_time)}` : ""}
                          </div>
                        )}
                        {showDriver && (
                          <>
                            <div className="text-xs">
                              <span className="text-muted-foreground">{t("guest.labels.driver")}: </span>
                              {r.driver_name}
                            </div>
                            {r.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{r.contact_phone}</div>}
                            {r.description && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{r.description}</div>}
                            {r.notes && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{r.notes}</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
      </FoldCard>

      <TodayStudyFieldCards studies={todayField} fieldMeetings={todayFieldMeetings} fmtTime={fmtTime} foldScope={foldScope} />

      <FoldCard id={`${foldScope}:meetings`} icon={<Mic className="h-4 w-4" />} title={t("guest.today.meetings")}>
          {!hasMeetings ? (
            <div className="text-xs text-muted-foreground">{t("guest.today.noMeetings")}</div>
          ) : (
            <>
              {showMidweek && midweekToRender.map((m) => (
                <div key={m.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.midweek")}{m.meeting_at ? ` • ${fmtAt(m.meeting_at)}` : ""}</div>
                  {m.chairman && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.chairman")}: </span>{m.chairman}</div>}
                  {m.service_talk_theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.serviceTalk")}: </span>{m.service_talk_theme}</div>}
                  {snap.templateExtras?.midweek?.final_song && <div className="text-xs"><span className="text-muted-foreground">{FINAL_SONG}: </span>{snap.templateExtras.midweek.final_song}</div>}
                  {m.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{m.closing_prayer}</div>}
                  {snap.templateExtras?.midweek?.observations && (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">{snap.templateExtras.midweek.observations}</div>
                  )}
                </div>
              ))}
              {todayWeekend.map((w) => (
                <div key={w.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.weekend")} • {fmtAt(w.meeting_at)}</div>
                  {w.public_talk_theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.publicTalk")}: </span>{w.public_talk_theme}</div>}
                  {w.talk_theme_title && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.finalTalk")}: </span>{w.talk_theme_title}</div>}
                  {snap.templateExtras?.weekend?.opening_song && (
                    <div className="text-xs"><span className="text-muted-foreground">{t("meetingsTalks.fromTemplate.weekendOpeningSong", { defaultValue: "Cântico de abertura" })}: </span>{snap.templateExtras.weekend.opening_song}</div>
                  )}
                  {snap.templateExtras?.weekend?.closing_song && (
                    <div className="text-xs"><span className="text-muted-foreground">{t("meetingsTalks.fromTemplate.weekendClosingSong", { defaultValue: "Cântico final" })}: </span>{snap.templateExtras.weekend.closing_song}</div>
                  )}
                  {snap.templateExtras?.weekend?.observations && (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">{snap.templateExtras.weekend.observations}</div>
                  )}
                </div>
              ))}
              {todayPioneer.map((p) => (
                <div key={p.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.pioneer")} • {pioneerWhen(snap)}</div>
                  {p.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</div>}
                  {p.theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.theme")}: </span>{p.theme}</div>}
                  {p.opening_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.openingPrayer")}: </span>{p.opening_prayer}</div>}
                  {p.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{p.closing_prayer}</div>}
                  {snap.templateExtras?.pioneer?.observations && (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">{snap.templateExtras.pioneer.observations}</div>
                  )}
                </div>
              ))}
              {showElders && eldersToRender.map((e) => (
                <div key={e.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                  <div className="font-medium">{t("guest.today.elders")} • {eldersWhen(snap)}</div>
                  {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
                  {e.theme && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.theme")}: </span>{e.theme}</div>}
                  {e.opening_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.openingPrayer")}: </span>{e.opening_prayer}</div>}
                  {e.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">{t("guest.labels.closingPrayer")}: </span>{e.closing_prayer}</div>}
                  {snap.templateExtras?.elders?.observations && (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">{snap.templateExtras.elders.observations}</div>
                  )}
                </div>
              ))}
            </>
          )}
      </FoldCard>

      {todaySchedule.length > 0 && (
        <FoldCard id={`${foldScope}:other`} icon={<CalendarDays className="h-4 w-4" />} title={t("guest.today.otherEvents")}>
            {todaySchedule.map((e) => (
              <div key={e.id} className="text-sm border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">
                  {fmtTime(e.start_time)}{e.end_time ? ` → ${fmtTime(e.end_time)}` : ""} — {e.title}
                </div>
                {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
                {e.notes && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{e.notes}</div>}
              </div>
            ))}
        </FoldCard>
      )}

      {upcoming.length > 0 && (
        <FoldCard id={`${foldScope}:upcoming`} icon={<CalendarDays className="h-4 w-4" />} title={t("guest.today.upcoming", { defaultValue: "Próximos eventos da semana" })}>
            {upcoming.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => goToIso(e.event_date)}
                className="w-full text-left text-sm border-l-2 border-primary/30 pl-2 py-1 rounded-r hover:bg-muted/50"
              >
                <div className="font-medium">
                  <span className="capitalize text-primary">{format(parseISO(e.event_date), "EEE dd/MM", { locale: dateLocale })}</span>
                  {e.start_time ? ` · ${fmtTime(e.start_time)}` : ""} — {e.title}
                </div>
                {e.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
              </button>
            ))}
        </FoldCard>
      )}
    </div>
  );
}

/** Cartão de resumo "Casal" no painel da esposa: contador de não-lidas + atalho. */
function WifeCoupleSummaryCard({ code, onOpen }: { code: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const listFn = useServerFn(wifeListCoupleMessages);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: r } = await readFnWithMirrorSafe(`wife-couple:${code}`, () => listFn({ data: { inviteCode: code } }));
        if (cancelled || !r?.ok) return;
        setUnread(r.unread);
        setTotal(r.threads.length);
      } catch (err) {
        console.warn("[wife-couple-card] load failed", err);
      }
    };
    load();
    const stop = setVisibleInterval(load, 30_000);
    return () => { cancelled = true; stop(); };
  }, [listFn, code]);

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Heart className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-semibold text-sm">
            {t("guest.tabs.couple")}
            {unread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-destructive text-destructive-foreground">
                {unread}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {unread > 0
              ? t("couple.unreadSummary", { count: unread, defaultValue: `${unread} novo(s) recado(s) do superintendente` })
              : total > 0
                ? t("couple.summaryNoNew", { defaultValue: "Sem recados novos." })
                : t("couple.noMessages")}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          {t("couple.open", { defaultValue: "Abrir" })}
        </Button>
      </CardContent>
    </Card>
  );
}

function FoldAllRow({ ids }: { ids: string[] }) {
  return <div className="flex justify-end"><FoldAllButton ids={ids} /></div>;
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

      {selected.reunioes && (
        <Section
          title={t("guest.sections.reunioes")}
          empty={snap.midweek.length + snap.weekend.length + snap.pioneer.length + snap.elders.length === 0}
        >
          {snap.midweek.map((m) => (
            <div key={`mw-${m.id}`} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{t("guest.meetingsTalks.midweek")}{m.meeting_at ? ` • ${formatAnchorWeekdayTime(m.meeting_at)}` : ""}</div>
              {m.chairman && <div className="text-xs">{t("guest.labels.chairman")}: {m.chairman}</div>}
              {m.service_talk_theme && <div className="text-xs">{t("guest.labels.serviceTalk")}: {m.service_talk_theme}</div>}
              {m.closing_prayer && <div className="text-xs">{t("guest.labels.closingPrayer")}: {m.closing_prayer}</div>}
            </div>
          ))}
          {snap.weekend.map((w) => (
            <div key={`we-${w.id}`} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{t("guest.meetingsTalks.weekend")}{w.meeting_at ? ` • ${formatAnchorWeekdayTime(w.meeting_at)}` : ""}</div>
              {w.public_talk_theme && <div className="text-xs">{t("guest.labels.publicTalk")}: {w.public_talk_theme}</div>}
              {w.talk_theme_title && <div className="text-xs">{t("guest.labels.finalTalk")}: {w.talk_theme_title}</div>}
            </div>
          ))}
          {snap.pioneer.map((p) => (
            <div key={`pi-${p.id}`} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{t("guest.meetingsTalks.pioneer")} • {pioneerWhen(snap)}</div>
              {p.location && <div className="text-xs text-gray-600">📍 {p.location}</div>}
              {p.theme && <div className="text-xs">{t("guest.labels.theme")}: {p.theme}</div>}
              {p.opening_prayer && <div className="text-xs">{t("guest.labels.openingPrayer")}: {p.opening_prayer}</div>}
              {p.closing_prayer && <div className="text-xs">{t("guest.labels.closingPrayer")}: {p.closing_prayer}</div>}
            </div>
          ))}
          {snap.elders.map((e) => (
            <div key={`el-${e.id}`} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{t("guest.meetingsTalks.elders")} • {eldersWhen(snap)}</div>
              {e.location && <div className="text-xs text-gray-600">📍 {e.location}</div>}
              {e.theme && <div className="text-xs">{t("guest.labels.theme")}: {e.theme}</div>}
              {e.opening_prayer && <div className="text-xs">{t("guest.labels.openingPrayer")}: {e.opening_prayer}</div>}
              {e.closing_prayer && <div className="text-xs">{t("guest.labels.closingPrayer")}: {e.closing_prayer}</div>}
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
          {groupTransport(snap.transport).map((g) => {
            const head = g.rows[0];
            return (
              <div key={g.key} className="py-1 border-b border-gray-100 last:border-0">
                <div className="font-medium">
                  {head.event_date ? fmtDate(head.event_date) : t("guest.labels.noDate")}
                  {head.all_day ? ` — ${t("transport.allDay", { defaultValue: "Apoiar todos os eventos/horários" })}` : ""}
                </div>
                {g.rows.map((r, idx) => {
                  const showDriver = !head.all_day || idx === 0;
                  const typeLbl = r.event_type ? t(`transport.eventType.${r.event_type}`, { defaultValue: r.event_type }) : null;
                  const dirLbl = r.direction ? t(`transport.direction.${r.direction}`, { defaultValue: r.direction }) : null;
                  return (
                    <div key={r.id} className="text-xs ml-2">
                      {(typeLbl || dirLbl) && <div>{typeLbl ?? ""}{dirLbl ? ` · ${dirLbl}` : ""}</div>}
                      {(r.departure_time || r.return_time) && (
                        <div>🕒 {fmtTime(r.departure_time ?? null)}{r.return_time ? ` → ${fmtTime(r.return_time)}` : ""}</div>
                      )}
                      {showDriver && (
                        <>
                          <div>{t("guest.labels.driver")}: {r.driver_name}</div>
                          {r.contact_phone && <div>📞 {r.contact_phone}</div>}
                          {r.description && <div className="text-gray-600">{r.description}</div>}
                          {r.notes && <div className="text-gray-600">{r.notes}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Section>
      )}

      {selected.pastoreios && !snap.wifeMode && snap.elderProgram && isElderUnlocked(snap.congregation.id) && (
        <Section
          title={t("guest.sections.pastoreios")}
          empty={
            snap.elderProgram.pastoral.length +
              snap.elderProgram.encouragement.length +
              snap.elderProgram.recommendations.length +
              snap.elderProgram.local.length === 0
          }
        >
          {([
            ["pastoral", snap.elderProgram.sections.pastoral, snap.elderProgram.pastoral],
            ["encouragement", snap.elderProgram.sections.encouragement, snap.elderProgram.encouragement],
            ["recommendations", snap.elderProgram.sections.recommendations, snap.elderProgram.recommendations],
            ["local", snap.elderProgram.sections.local, snap.elderProgram.local],
          ] as const).map(([key, title, items]) => items.length === 0 ? null : (
            <div key={key} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-semibold text-xs uppercase tracking-wide text-gray-700">{title}</div>
              {items.map((it) => {
                const name = it.family_name ?? it.person_name ?? it.full_name ?? it.subject ?? "—";
                return (
                  <div key={it.id} className="text-xs ml-2">
                    {it.slot_label ? <span className="text-gray-500">{it.slot_label}: </span> : null}
                    {name}
                  </div>
                );
              })}
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

function WifeCouplePanel({ code }: { code: string }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const listFn = useServerFn(wifeListCoupleMessages);
  const createFn = useServerFn(wifeCreateCoupleMessage);
  const markFn = useServerFn(wifeMarkCoupleMessagesRead);
  const [threads, setThreads] = useState<CoupleThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: r } = await readFnWithMirrorSafe(`wife-couple:${code}`, () => listFn({ data: { inviteCode: code } }));
      if (r?.ok) setThreads(r.threads);
    } catch (err) {
      console.warn("[wife-couple] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [listFn, code]);

  useEffect(() => {
    load();
    markFn({ data: { inviteCode: code } }).catch(() => {});
    return setVisibleInterval(load, 30_000);
  }, [load, markFn, code]);

  const send = async () => {
    if (!title.trim()) return toast.error(t("couple.titleRequired"));
    if (!body.trim()) return toast.error(t("couple.bodyRequired"));
    setSending(true);
    try {
      await createFn({ data: { inviteCode: code, title: title.trim(), body: body.trim() } });
      toast.success(t("couple.sent"));
      setTitle(""); setBody(""); setOpen(false); load();
    } catch { toast.error(t("couple.sendFailed")); }
    finally { setSending(false); }
  };

  const sendReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await createFn({ data: { inviteCode: code, parentId, body: replyBody.trim() } });
      setReplyBody(""); setReplyOpen(null); load();
    } catch { toast.error(t("couple.sendFailed")); }
    finally { setSending(false); }
  };

  const fmt = (iso: string) => format(parseISO(iso), "dd/MM HH:mm", { locale: dateLocale });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("couple.subtitleWife")}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("couple.newMessage")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("couple.newMessageTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("couple.titleField")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("couple.bodyField")}</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={send} disabled={sending}><Send className="h-4 w-4 mr-1" />{sending ? "…" : t("couple.send")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : threads.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{t("couple.noMessages")}</CardContent></Card>
      ) : threads.map((th) => (
        <Card key={th.root.id}>
          <CardContent className="p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-primary/70 font-semibold">
              {th.root.author === "wife" ? t("couple.fromWife") : t("couple.fromSuper")} · {fmt(th.root.created_at)}
            </div>
            <div className="font-semibold break-words">{th.root.title}</div>
            <p className="text-sm whitespace-pre-wrap break-words">{th.root.body}</p>
            {th.replies.length > 0 && (
              <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                {th.replies.map((rep) => (
                  <div key={rep.id} className="text-sm">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                      {rep.author === "wife" ? t("couple.fromWife") : t("couple.fromSuper")} · {fmt(rep.created_at)}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{rep.body}</p>
                  </div>
                ))}
              </div>
            )}
            {replyOpen === th.root.id ? (
              <div className="space-y-2">
                <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder={t("couple.replyPlaceholder")} rows={3} maxLength={4000} />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setReplyOpen(null); setReplyBody(""); }}>{t("common.cancel")}</Button>
                  <Button size="sm" onClick={() => sendReply(th.root.id)} disabled={sending}><Send className="h-3.5 w-3.5 mr-1" />{t("couple.send")}</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setReplyOpen(th.root.id)}>{t("couple.reply")}</Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GuestReminders({ snap, code }: { snap: Snapshot; code: string }) {
  const { t } = useTranslation();
  const scope = `guest-${code.toUpperCase()}`;
  const mealName = (type: string) => type === "lunch" ? t("guest.meal.lunch") : type === "dinner" ? t("guest.meal.dinner") : t("guest.meal.breakfast");
  const items: TimelineSource[] = [
    ...snap.schedule.map((e) => ({ id: `s-${e.id}`, kind: "schedule" as const, date: e.event_date, time: e.start_time, title: e.title, subtitle: e.location })),
    ...snap.meals.map((m) => ({ id: `m-${m.id}`, kind: "meal" as const, date: m.meal_date, time: m.meal_time, title: `${mealName(m.type)}${m.host_name ? ` — ${m.host_name}` : ""}`, subtitle: m.location })),
    ...snap.fieldMeetings.map((f) => ({ id: `f-${f.id}`, kind: "field" as const, date: f.event_date, time: f.meeting_time, title: t("guest.tabs.field"), subtitle: f.meeting_location ?? f.territory_location })),
    ...snap.field.map((f) => ({ id: `a-${f.id}`, kind: "field" as const, date: f.event_date, time: f.meeting_time, title: t("guest.tabs.field"), subtitle: f.meeting_point })),
    ...snap.transport.filter((tp) => tp.event_date).map((tp) => ({ id: `t-${tp.id}`, kind: "transport" as const, date: tp.event_date as string, time: tp.departure_time ?? null, title: `${t("guest.tabs.transport")} — ${tp.driver_name}`, subtitle: tp.description })),
  ];
  return (
    <>
      <EventReminderSync items={items} scope={scope} role="wife" />
      <ReminderSettingsCard scope={scope} role="wife" />
    </>
  );
}

// Faixa de dias da visita: o dia escolhido desliza para o centro; "Hoje" leva um selo.
function DayPillsStrip({ pills, viewedIso, todayIso, todayLabel, ariaLabel, onPick }: {
  pills: Array<{ iso: string; weekday: string; day: string }>;
  viewedIso: string;
  todayIso: string;
  todayLabel: string;
  ariaLabel: string;
  onPick: (iso: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-iso="${viewedIso}"]`);
    if (!strip || !el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: firstRun.current ? "auto" : "smooth" });
    firstRun.current = false;
  }, [viewedIso, pills.length]);
  return (
    <div ref={stripRef} className="relative flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label={ariaLabel} title={todayLabel}>
      {pills.map((d) => {
        const active = d.iso === viewedIso;
        const isToday = d.iso === todayIso;
        return (
          <button
            key={d.iso}
            data-iso={d.iso}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={isToday ? "date" : undefined}
            onClick={() => onPick(d.iso)}
            className={`relative shrink-0 min-w-[52px] rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : isToday
                  ? "bg-background text-primary border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            <div className="capitalize leading-tight">{d.weekday}</div>
            <div className="leading-tight opacity-80">{d.day}</div>
          </button>
        );
      })}
    </div>
  );
}
