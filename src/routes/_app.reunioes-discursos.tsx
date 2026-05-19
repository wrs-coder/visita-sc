import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

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

function Page() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Reuniões e Discursos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pacote unificado por visita: reuniões de campo, meio de semana, fim de semana, pioneiros e anciãos/servos.
        </p>
      </div>
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
        <TabsContent value="campo" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><FieldMeetingsPanel /></Suspense></TabsContent>
        <TabsContent value="meio" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><MidweekPanel /></Suspense></TabsContent>
        <TabsContent value="fim" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><WeekendPanel /></Suspense></TabsContent>
        <TabsContent value="pioneiros" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><PioneerPanel /></Suspense></TabsContent>
        <TabsContent value="ancios" className="mt-4 tab-fade-in"><Suspense fallback={<PanelFallback />}><EldersServantsPanel /></Suspense></TabsContent>
      </Tabs>
    </div>
  );
}
