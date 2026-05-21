import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { readGuestSession, clearGuestSession } from "@/lib/guest-session";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { LogOut, CalendarDays, UtensilsCrossed, Users, Car, MapPin, Clock, Phone, ListChecks, Compass, Share2, Image as ImageIcon, FileDown, MessageCircle, Sun, Mic } from "lucide-react";
import { Logo } from "@/components/Logo";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
// html-to-image e jsPDF são carregados sob demanda apenas quando o utilizador
// clica em "Exportar PNG" ou "Exportar PDF".

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
}

type SectionKey = "cron" | "estudos" | "campo" | "ref" | "trans" | "check";

const SECTION_LABELS: Record<SectionKey, string> = {
  cron: "Cronograma",
  estudos: "Estudos / Revisitas",
  campo: "Reuniões de campo",
  ref: "Refeições",
  trans: "Transporte",
  check: "Checklist",
};

function fmtDate(d: string) { return format(parseISO(d), "EEE, d 'de' MMM", { locale: ptBR }); }
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : "—"; }
function mealLabel(t: string) { return t === "lunch" ? "Almoço" : t === "dinner" ? "Jantar" : "Café"; }

function Page() {
  const nav = useNavigate();
  const fn = useServerFn(getGuestSnapshot);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    const r = await fn({ data: { inviteCode: c } });
    setLoading(false);
    if (!r.ok) { clearGuestSession(); nav({ to: "/" }); return; }
    setSnap(r as unknown as Snapshot);
  }, [fn, nav]);

  useEffect(() => {
    const c = readGuestSession();
    if (!c) { nav({ to: "/" }); return; }
    setCode(c);
    load(c);
  }, [load, nav]);

  const exit = () => { clearGuestSession(); nav({ to: "/" }); };

  // ── Share dialog state ────────────────────────────────────────────────
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
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(previewRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `programacao-${filenameBase}.png`;
      a.click();
      toast.success("Imagem gerada");
    } catch { toast.error("Falha ao gerar imagem"); }
  }, [filenameBase]);

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
      pdf.save(`programacao-${filenameBase}.pdf`);
      toast.success("PDF gerado");
    } catch { toast.error("Falha ao gerar PDF"); }
  }, [filenameBase]);

  const shareWhatsapp = useCallback(() => {
    if (!snap || !snap.visit) return;
    const L: string[] = [];
    L.push(`*${snap.congregation.name}*`);
    L.push(`*${snap.visit.title}*`);
    L.push(`${fmtDate(snap.visit.start_date)} — ${fmtDate(snap.visit.end_date)}`);
    if (selected.cron && snap.schedule.length) {
      L.push("", "*Cronograma*");
      snap.schedule.forEach((e) => L.push(`• ${fmtDate(e.event_date)} ${fmtTime(e.start_time)} — ${e.title}${e.location ? ` (${e.location})` : ""}`));
    }
    if (selected.estudos && snap.field.length) {
      L.push("", "*Estudos / Revisitas*");
      snap.field.forEach((f) => L.push(`• ${fmtDate(f.event_date)} ${f.period} ${fmtTime(f.meeting_time)}${f.meeting_point ? ` — ${f.meeting_point}` : ""}${f.acompanhante ? ` | Acomp.: ${f.acompanhante}` : ""}`));
    }
    if (selected.campo && snap.fieldMeetings.length) {
      L.push("", "*Reuniões de campo*");
      snap.fieldMeetings.forEach((f) => L.push(`• ${fmtDate(f.event_date)} ${f.period} ${fmtTime(f.meeting_time)} — ${f.modality}${f.territory_location ? ` (${f.territory_location})` : ""}${f.auxiliary_leaders ? ` | Aux.: ${f.auxiliary_leaders}` : ""}`));
    }
    if (selected.ref && (snap.meals.length || snap.mealDayNotes.length)) {
      L.push("", "*Refeições*");
      snap.mealDayNotes.forEach((n) => L.push(`• ${fmtDate(n.meal_date)}: ${n.notes}`));
      snap.meals.forEach((m) => L.push(`• ${fmtDate(m.meal_date)} ${mealLabel(m.type)} ${fmtTime(m.meal_time)}${m.host_name ? ` — ${m.host_name}` : ""}${m.location ? ` (${m.location})` : ""}`));
    }
    if (selected.trans && snap.transport.length) {
      L.push("", "*Transporte*");
      snap.transport.forEach((t) => L.push(`• ${t.event_date ? fmtDate(t.event_date) : "Sem data"} — ${t.driver_name}${t.contact_phone ? ` (${t.contact_phone})` : ""}`));
    }
    if (selected.check && snap.checklist.length && !snap.wifeMode) {
      L.push("", "*Checklist*");
      snap.checklist.forEach((c) => L.push(`• [${c.status}] ${c.title}${c.description ? ` — ${c.description}` : ""}`));
    }
    const text = encodeURIComponent(L.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [snap, selected]);

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
              <div className="text-[11px] opacity-80">{snap.wifeMode ? "Esposa do superintendente" : "Corpo de anciãos e ES"} • somente leitura</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
                  <Share2 className="h-4 w-4 mr-1" /> Partilhar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Partilhar programação</DialogTitle>
                  <DialogDescription>Escolha as seções e veja uma pré-visualização antes de exportar.</DialogDescription>
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
                  <div className="text-xs text-muted-foreground mb-2">Pré-visualização</div>
                  <div ref={previewRef} className="bg-white p-4 rounded shadow-sm">
                    <SharePreview snap={snap} selected={selected} />
                  </div>
                </div>

                <DialogFooter className="flex-row flex-wrap justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={exportPng}><ImageIcon className="h-4 w-4 mr-1" />PNG</Button>
                  <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
                  <Button size="sm" onClick={shareWhatsapp}><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={exit} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {!snap.visit ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
            Nenhuma visita ativa nesta congregação no momento.
          </CardContent></Card>
        ) : (
          <>
            <Card><CardContent className="p-4">
              <h1 className="font-semibold">{snap.visit.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmtDate(snap.visit.start_date)} — {fmtDate(snap.visit.end_date)}
              </p>
            </CardContent></Card>

            <Tabs defaultValue="cron">
              <TabsList className={`grid w-full ${snap.wifeMode ? "grid-cols-5" : "grid-cols-6"}`}>
                <TabsTrigger value="cron"><CalendarDays className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Cronograma</span></TabsTrigger>
                <TabsTrigger value="estudos"><Users className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Estudos</span></TabsTrigger>
                <TabsTrigger value="campo"><Compass className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Campo</span></TabsTrigger>
                <TabsTrigger value="ref"><UtensilsCrossed className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Refeições</span></TabsTrigger>
                <TabsTrigger value="trans"><Car className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Transporte</span></TabsTrigger>
                {!snap.wifeMode && (
                  <TabsTrigger value="check"><ListChecks className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Checklist</span></TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="cron" className="space-y-2 mt-4">
                {snap.schedule.length === 0 ? <Empty text="Sem eventos." /> :
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
                {snap.field.length === 0 ? <Empty text="Sem estudos agendados." /> :
                  snap.field.map((f) => (
                    <Card key={f.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{fmtDate(f.event_date)} • {f.period}</div>
                        {f.meeting_time && <span className="text-xs"><Clock className="inline h-3 w-3" /> {fmtTime(f.meeting_time)}</span>}
                      </div>
                      {f.meeting_point && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.meeting_point}</div>}
                      {f.acompanhante && <div className="text-xs"><span className="text-muted-foreground">Acompanhante: </span>{f.acompanhante}{f.acompanhante_for ? ` (com ${f.acompanhante_for})` : ""}</div>}
                      {f.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{f.contact_phone}</div>}
                    </CardContent></Card>
                  ))}
              </TabsContent>

              <TabsContent value="campo" className="space-y-2 mt-4">
                {snap.fieldMeetings.length === 0 ? <Empty text="Sem reuniões de campo." /> :
                  snap.fieldMeetings.map((f) => (
                    <Card key={f.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{fmtDate(f.event_date)} • {f.period}</div>
                        {f.meeting_time && <span className="text-xs"><Clock className="inline h-3 w-3" /> {fmtTime(f.meeting_time)}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">Modalidade: {f.modality}</div>
                      {f.territory_number && <div className="text-xs"><span className="text-muted-foreground">Território S-13: </span>{f.territory_number}</div>}
                      {f.territory_location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.territory_location}</div>}
                      {f.auxiliary_leaders && <div className="text-xs"><span className="text-muted-foreground">Dirigentes auxiliares: </span>{f.auxiliary_leaders}</div>}
                      {f.closing_prayer && <div className="text-xs"><span className="text-muted-foreground">Oração final: </span>{f.closing_prayer}</div>}
                    </CardContent></Card>
                  ))}
              </TabsContent>

              <TabsContent value="ref" className="space-y-2 mt-4">
                {snap.meals.length === 0 && snap.mealDayNotes.length === 0 ? <Empty text="Sem refeições agendadas." /> : (() => {
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
                            {m.host_name && <div className="text-xs"><span className="text-muted-foreground">Anfitrião: </span>{m.host_name}</div>}
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
                {snap.transport.length === 0 ? <Empty text="Sem transporte agendado." /> :
                  snap.transport.map((t) => (
                    <Card key={t.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{t.event_date ? fmtDate(t.event_date) : "Sem data"}</div>
                      </div>
                      <div className="text-xs"><span className="text-muted-foreground">Motorista: </span>{t.driver_name}</div>
                      {t.contact_phone && <div className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{t.contact_phone}</div>}
                      {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                      {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                    </CardContent></Card>
                  ))}
              </TabsContent>

              {!snap.wifeMode && (
                <TabsContent value="check" className="space-y-2 mt-4">
                  {snap.checklist.length === 0 ? <Empty text="Sem itens na checklist." /> :
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
          <Button variant="outline" size="sm" onClick={() => code && load(code)}>Atualizar</Button>
        </div>
      </main>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{text}</CardContent></Card>;
}

// ── Share preview (rendered inside the dialog and used as the export source) ──
function SharePreview({ snap, selected }: { snap: Snapshot; selected: Record<SectionKey, boolean> }) {
  if (!snap.visit) return <div className="text-sm text-gray-500">Nenhuma visita ativa.</div>;
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

      {!anySelected && <div className="text-xs text-gray-500 italic">Selecione ao menos uma seção.</div>}

      {selected.cron && (
        <Section title="Cronograma" empty={snap.schedule.length === 0}>
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
        <Section title="Estudos / Revisitas" empty={snap.field.length === 0}>
          {snap.field.map((f) => (
            <div key={f.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{fmtDate(f.event_date)} • {f.period} • {fmtTime(f.meeting_time)}</div>
              {f.meeting_point && <div className="text-xs text-gray-600">📍 {f.meeting_point}</div>}
              {f.acompanhante && <div className="text-xs">Acomp.: {f.acompanhante}{f.acompanhante_for ? ` (com ${f.acompanhante_for})` : ""}</div>}
              {f.contact_phone && <div className="text-xs">📞 {f.contact_phone}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.campo && (
        <Section title="Reuniões de campo" empty={snap.fieldMeetings.length === 0}>
          {snap.fieldMeetings.map((f) => (
            <div key={f.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{fmtDate(f.event_date)} • {f.period} • {fmtTime(f.meeting_time)}</div>
              <div className="text-xs">Modalidade: {f.modality}</div>
              {f.territory_number && <div className="text-xs">Território S-13: {f.territory_number}</div>}
              {f.territory_location && <div className="text-xs text-gray-600">📍 {f.territory_location}</div>}
              {f.auxiliary_leaders && <div className="text-xs">Dirigentes auxiliares: {f.auxiliary_leaders}</div>}
              {f.closing_prayer && <div className="text-xs">Oração final: {f.closing_prayer}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.ref && (
        <Section title="Refeições" empty={mealDates.length === 0}>
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
        <Section title="Transporte" empty={snap.transport.length === 0}>
          {snap.transport.map((t) => (
            <div key={t.id} className="py-1 border-b border-gray-100 last:border-0">
              <div className="font-medium">{t.event_date ? fmtDate(t.event_date) : "Sem data"} — {t.driver_name}</div>
              {t.contact_phone && <div className="text-xs">📞 {t.contact_phone}</div>}
              {t.description && <div className="text-xs text-gray-600">{t.description}</div>}
              {t.notes && <div className="text-xs text-gray-600">{t.notes}</div>}
            </div>
          ))}
        </Section>
      )}

      {selected.check && !snap.wifeMode && (
        <Section title="Checklist" empty={snap.checklist.length === 0}>
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
  return (
    <div>
      <div className="font-semibold text-sm border-b border-gray-300 mb-1 pb-0.5">{title}</div>
      {empty ? <div className="text-xs text-gray-400 italic">— vazio —</div> : <div>{children}</div>}
    </div>
  );
}
