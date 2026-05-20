import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useActiveCongregation,
  getActiveCongregationOverride,
  setActiveCongregationOverride,
} from "@/hooks/use-active-congregation";
import { useServerFn } from "@tanstack/react-start";
import { listMyCongregations } from "@/lib/congregations.functions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Lazy: cada painel só carrega quando o utilizador entra na respectiva aba.
const FieldMeetingsPanel = lazy(() =>
  import("@/components/meetings/FieldMeetingsPanel").then((m) => ({ default: m.FieldMeetingsPanel })),
);
const MidweekPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.MidweekPanel })),
);
const WeekendPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.WeekendPanel })),
);
const PioneerPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.PioneerPanel })),
);
const EldersServantsPanel = lazy(() =>
  import("@/components/meetings/MeetingPanels").then((m) => ({ default: m.EldersServantsPanel })),
);

export const Route = createFileRoute("/_app/reunioes-discursos")({ component: Page });

function PanelFallback() {
  return (
    <div className="flex items-center justify-center py-10 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
    </div>
  );
}

/**
 * Para o Superintendente: garante que sempre exista uma visita para a
 * congregação selecionada, criando uma "Programação geral" silenciosamente
 * caso ainda não exista nenhuma — assim os painéis abrem sem depender de
 * agendamento de calendário.
 */
function useEnsureVisitForSuper(congregationId: string | null, enabled: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || !congregationId) { setReady(false); return; }
    let cancelled = false;
    (async () => {
      setReady(false);
      const { data } = await supabase
        .from("visits").select("id").eq("congregation_id", congregationId).limit(1);
      if (cancelled) return;
      if (!data || data.length === 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        await supabase.from("visits").insert({
          congregation_id: congregationId,
          title: "Programação geral",
          start_date: today,
          end_date: today,
          is_active: true,
        });
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [congregationId, enabled]);
  return ready;
}

function SuperCongregationSelector() {
  const fnList = useServerFn(listMyCongregations);
  const [congs, setCongs] = useState<{ id: string; name: string }[]>([]);
  const active = useActiveCongregation();
  const [value, setValue] = useState<string>(active?.id ?? "");

  useEffect(() => {
    (async () => {
      const res = await fnList();
      if (res.ok) setCongs((res.data as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
    })();
  }, [fnList]);

  useEffect(() => {
    const cur = getActiveCongregationOverride() ?? active?.id ?? "";
    setValue(cur);
  }, [active?.id]);

  const onChange = (id: string) => {
    setValue(id);
    setActiveCongregationOverride(id);
  };

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium sm:min-w-[160px]">
          Congregação selecionada
        </div>
        <div className="flex-1">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Escolha uma congregação…" /></SelectTrigger>
            <SelectContent>
              {congs.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const { role } = useAuth();
  const isSuper = role === "superintendent";
  const active = useActiveCongregation();
  const ready = useEnsureVisitForSuper(active?.id ?? null, isSuper);
  const panelsReady = !isSuper || ready;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reuniões e Discursos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pacote unificado por visita: reuniões de campo, meio de semana, fim de semana, pioneiros e anciãos/servos.
        </p>
      </div>

      {isSuper && <SuperCongregationSelector />}

      <Tabs defaultValue="campo" className="w-full">
        {/* Filtros: linha única, scroll horizontal silencioso, sem fundo cinza pesado. */}
        <div className="-mx-1 overflow-x-auto scrollbar-none">
          <TabsList className="flex flex-nowrap w-max h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="campo" className="shrink-0 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">Campo</TabsTrigger>
            <TabsTrigger value="meio" className="shrink-0 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">Meio de Semana</TabsTrigger>
            <TabsTrigger value="fim" className="shrink-0 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">Fim de Semana</TabsTrigger>
            <TabsTrigger value="pioneiros" className="shrink-0 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">Pioneiros</TabsTrigger>
            <TabsTrigger value="ancios" className="shrink-0 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border/60">Anciãos e Servos</TabsTrigger>
          </TabsList>
        </div>
        {panelsReady ? (
          <>
            <TabsContent value="campo" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><FieldMeetingsPanel /></Suspense></TabsContent>
            <TabsContent value="meio" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><MidweekPanel /></Suspense></TabsContent>
            <TabsContent value="fim" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><WeekendPanel /></Suspense></TabsContent>
            <TabsContent value="pioneiros" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><PioneerPanel /></Suspense></TabsContent>
            <TabsContent value="ancios" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><EldersServantsPanel /></Suspense></TabsContent>
          </>
        ) : (
          <PanelFallback />
        )}
      </Tabs>
    </div>
  );
}
