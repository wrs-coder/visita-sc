import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldMeetingsPanel } from "@/components/meetings/FieldMeetingsPanel";
import {
  MidweekPanel, WeekendPanel, PioneerPanel, EldersServantsPanel,
} from "@/components/meetings/MeetingPanels";

export const Route = createFileRoute("/_app/reunioes-discursos")({ component: Page });

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
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="campo">Campo</TabsTrigger>
          <TabsTrigger value="meio">Meio de Semana</TabsTrigger>
          <TabsTrigger value="fim">Fim de Semana</TabsTrigger>
          <TabsTrigger value="pioneiros">Pioneiros</TabsTrigger>
          <TabsTrigger value="ancios">Anciãos e Servos</TabsTrigger>
        </TabsList>
        <TabsContent value="campo" className="mt-4"><FieldMeetingsPanel /></TabsContent>
        <TabsContent value="meio" className="mt-4"><MidweekPanel /></TabsContent>
        <TabsContent value="fim" className="mt-4"><WeekendPanel /></TabsContent>
        <TabsContent value="pioneiros" className="mt-4"><PioneerPanel /></TabsContent>
        <TabsContent value="ancios" className="mt-4"><EldersServantsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
