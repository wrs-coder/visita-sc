import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisitProgramTabs } from "@/components/visit-week/VisitProgramTabs";
import { useActiveVisit } from "@/hooks/use-active-visit";
import { ElderAgendaView } from "@/components/elder-agenda/ElderAgendaView";
import { useElderAgenda } from "@/components/elder-agenda/use-elder-agenda";

export const Route = createFileRoute("/_app/pauta-ancioes")({
  head: () => ({
    meta: [
      { title: "Pauta da reunião com os anciãos · Visita SC" },
      { name: "description", content: "Pauta da reunião do superintendente de circuito com os anciãos, preenchida em conjunto." },
      { property: "og:title", content: "Pauta da reunião com os anciãos" },
      { property: "og:description", content: "Pauta da reunião do superintendente de circuito com os anciãos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { visit, loading: visitLoading } = useActiveVisit();
  const { data, error, loading, reload, save } = useElderAgenda(visit?.id);
  return (
    <div className="space-y-4 max-w-2xl mx-auto overflow-x-hidden">
      <VisitProgramTabs />
      <h1 className="sr-only">Pauta da reunião com os anciãos</h1>
      {visitLoading || (loading && !data) ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !visit ? (
        <p className="text-sm text-muted-foreground text-center py-10">Nenhuma visita ativa.</p>
      ) : error && !data ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => void reload()}>Tentar de novo</Button>
        </div>
      ) : data ? (
        <ElderAgendaView key={data.visitId} data={data} save={save} />
      ) : null}
    </div>
  );
}
