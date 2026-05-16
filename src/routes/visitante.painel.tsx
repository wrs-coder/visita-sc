import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuestSnapshot } from "@/lib/guest.functions";
import { readGuestSession, clearGuestSession } from "@/lib/guest-session";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarDays, UtensilsCrossed, Users, Car, MapPin, Clock, Phone, ListChecks, Compass } from "lucide-react";
import { Logo } from "@/components/Logo";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
          <Button variant="ghost" size="sm" onClick={exit} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
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

              <TabsContent value="ref" className="space-y-2 mt-4">
                {snap.meals.length === 0 ? <Empty text="Sem refeições agendadas." /> :
                  snap.meals.map((m) => (
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
