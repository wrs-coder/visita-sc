// Cartão da aba "Anciãos" do Dashboard: resumo da pauta (recolhe/expande) com os links funcionando.
import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { agendaView } from "@/lib/elder-agenda/agenda";
import { AgendaLinkRow, formatMeetingWhen } from "./ElderAgendaView";
import { useElderAgenda } from "./use-elder-agenda";

export default function ElderAgendaDashboardCard({ visitId }: { visitId: string }) {
  const { data, loading, error } = useElderAgenda(visitId);
  const view = data ? agendaView(data.payload, data.auto) : null;
  const links = data?.payload.links.filter((l) => l.url || l.label) ?? [];
  return (
    <CollapsibleCard
      id="elder-agenda"
      accent="elder"
      icon={<ClipboardList className="h-4 w-4 text-primary" />}
      title="Pauta – reunião com os anciãos"
      headerRight={
        <Link to="/pauta-ancioes" className="text-primary text-xs font-medium inline-flex items-center hover:underline shrink-0">
          Abrir <ChevronRight className="h-3 w-3" />
        </Link>
      }
    >
      {loading && !data ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !data || !view ? (
        <p className="text-sm text-muted-foreground">{error ?? "Pauta indisponível."}</p>
      ) : (
        <div className="space-y-2 text-sm min-w-0">
          {data.auto.meetingAt ? <p className="text-muted-foreground break-words">{[formatMeetingWhen(data.auto.meetingAt), data.auto.location].filter(Boolean).join(" · ")}</p> : null}
          <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-0.5">
            <p className="font-medium break-words">Encorajamentos · {data.payload.encMinutes} min</p>
            {view.encTheme ? <p className="text-muted-foreground break-words">{view.encTheme}</p> : null}
          </div>
          {links.length ? <div className="divide-y rounded-lg border px-3">{links.map((l) => <AgendaLinkRow key={l.kind} {...l} />)}</div> : null}
          <ul className="space-y-1">
            <li className="flex justify-between gap-2"><span className="break-words">1) Cartas da filial</span><span className="text-muted-foreground shrink-0">{data.payload.lettersMinutes} min</span></li>
            <li className="flex justify-between gap-2"><span className="break-words">2) Recomendações{data.auto.recommendations.length ? ` (${data.auto.recommendations.length})` : ""}</span><span className="text-muted-foreground shrink-0">{data.payload.recsMinutes} min</span></li>
            <li className="flex justify-between gap-2"><span className="break-words">5) Assunto local{data.auto.local.length ? ` (${data.auto.local.length})` : ""}</span><span className="text-muted-foreground shrink-0">{data.payload.localMinutes} min</span></li>
          </ul>
          <p className="text-xs text-muted-foreground text-right">Tempo total: {view.totalMinutes} min</p>
        </div>
      )}
    </CollapsibleCard>
  );
}
